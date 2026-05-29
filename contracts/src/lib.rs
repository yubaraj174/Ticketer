#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env, String};
use soroban_sdk::token::Client as TokenClient;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotOrganizer = 3,
    TicketNotFound = 4,
    AlreadyScanned = 5,
    NotTicketOwner = 6,
    TicketAlreadySold = 7,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Organizer,
    NativeToken,
    Price,
    TicketIdCounter,
    Ticket(u64),
}

#[contracttype]
#[derive(Clone)]
pub struct Ticket {
    pub id: u64,
    pub owner: Address,
    pub event_name: String,
    pub date: String,
    pub seat_number: String,
    pub is_scanned: bool,
}

#[contract]
pub struct TicketingContract;

#[contractimpl]
impl TicketingContract {
    /// Initialize the contract with the organizer's address, the token used for payments (e.g. native XLM asset), and the price.
    pub fn init(env: Env, organizer: Address, native_token: Address, price: i128) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Organizer) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Organizer, &organizer);
        env.storage().instance().set(&DataKey::NativeToken, &native_token);
        env.storage().instance().set(&DataKey::Price, &price);
        env.storage().instance().set(&DataKey::TicketIdCounter, &0u64);
        Ok(())
    }

    /// Mint a new ticket into the system. Only the organizer can call this.
    /// The ticket is initially owned by the contract itself.
    pub fn mint(env: Env, event_name: String, date: String, seat_number: String) -> Result<u64, Error> {
        let organizer: Address = env.storage().instance().get(&DataKey::Organizer).ok_or(Error::NotInitialized)?;
        organizer.require_auth();

        let mut counter: u64 = env.storage().instance().get(&DataKey::TicketIdCounter).unwrap_or(0);
        counter += 1;

        let ticket = Ticket {
            id: counter,
            owner: env.current_contract_address(),
            event_name,
            date,
            seat_number,
            is_scanned: false,
        };

        env.storage().persistent().set(&DataKey::Ticket(counter), &ticket);
        env.storage().instance().set(&DataKey::TicketIdCounter, &counter);

        Ok(counter)
    }

    /// Buy a ticket directly from the contract. The buyer pays the set price in the specified token.
    pub fn buy_ticket(env: Env, buyer: Address, ticket_id: u64) -> Result<(), Error> {
        buyer.require_auth();

        let mut ticket: Ticket = env.storage().persistent().get(&DataKey::Ticket(ticket_id)).ok_or(Error::TicketNotFound)?;
        if ticket.owner != env.current_contract_address() {
            return Err(Error::TicketAlreadySold);
        }

        let organizer: Address = env.storage().instance().get(&DataKey::Organizer).ok_or(Error::NotInitialized)?;
        let token_addr: Address = env.storage().instance().get(&DataKey::NativeToken).ok_or(Error::NotInitialized)?;
        let price: i128 = env.storage().instance().get(&DataKey::Price).ok_or(Error::NotInitialized)?;

        // Transfer funds from the buyer to the organizer
        let token = TokenClient::new(&env, &token_addr);
        token.transfer(&buyer, &organizer, &price);

        ticket.owner = buyer.clone();
        env.storage().persistent().set(&DataKey::Ticket(ticket_id), &ticket);

        Ok(())
    }

    /// Transfer a ticket peer-to-peer.
    pub fn transfer(env: Env, from: Address, to: Address, ticket_id: u64) -> Result<(), Error> {
        from.require_auth();

        let mut ticket: Ticket = env.storage().persistent().get(&DataKey::Ticket(ticket_id)).ok_or(Error::TicketNotFound)?;
        if ticket.owner != from {
            return Err(Error::NotTicketOwner);
        }

        ticket.owner = to.clone();
        env.storage().persistent().set(&DataKey::Ticket(ticket_id), &ticket);

        Ok(())
    }

    /// Scan a ticket at the venue. Only the organizer can perform this operation.
    pub fn scan(env: Env, ticket_id: u64) -> Result<(), Error> {
        let organizer: Address = env.storage().instance().get(&DataKey::Organizer).ok_or(Error::NotInitialized)?;
        organizer.require_auth();

        let mut ticket: Ticket = env.storage().persistent().get(&DataKey::Ticket(ticket_id)).ok_or(Error::TicketNotFound)?;
        if ticket.is_scanned {
            return Err(Error::AlreadyScanned);
        }

        ticket.is_scanned = true;
        env.storage().persistent().set(&DataKey::Ticket(ticket_id), &ticket);

        Ok(())
    }

    /// Read-only: Get a specific ticket by ID
    pub fn get_ticket(env: Env, ticket_id: u64) -> Result<Ticket, Error> {
        env.storage().persistent().get(&DataKey::Ticket(ticket_id)).ok_or(Error::TicketNotFound)
    }

    /// Read-only: Retrieve the total number of minted tickets
    pub fn get_total_tickets(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TicketIdCounter).unwrap_or(0)
    }

    /// Read-only: Get the contract organizer
    pub fn get_organizer(env: Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Organizer).ok_or(Error::NotInitialized)
    }
    
    /// Read-only: Get the ticket price
    pub fn get_price(env: Env) -> Result<i128, Error> {
         env.storage().instance().get(&DataKey::Price).ok_or(Error::NotInitialized)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, IntoVal};

    #[test]
    fn test_init_and_mint() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TicketingContract);
        let client = TicketingContractClient::new(&env, &contract_id);

        let organizer = Address::generate(&env);
        let token = Address::generate(&env);
        
        client.init(&organizer, &token, &100_000_000);
        
        env.mock_all_auths();
        let ticket_id = client.mint(&String::from_str(&env, "Test Fest"), &String::from_str(&env, "2026-10-31"), &String::from_str(&env, "A1"));
        assert_eq!(ticket_id, 1);
        
        let t = client.get_ticket(&1);
        assert_eq!(t.event_name, String::from_str(&env, "Test Fest"));
        assert_eq!(t.is_scanned, false);
    }

    #[test]
    #[should_panic(expected = "HostError")]
    fn test_scan_not_organizer() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TicketingContract);
        let client = TicketingContractClient::new(&env, &contract_id);

        let organizer = Address::generate(&env);
        let token = Address::generate(&env);
        client.init(&organizer, &token, &100_000_000);
        
        env.mock_all_auths();
        client.mint(&String::from_str(&env, "Test Fest"), &String::from_str(&env, "2026-10-31"), &String::from_str(&env, "A1"));
        
        // Let's attempt to scan, mock_all_auths allows auths but we've explicitly requested organizer auths in scan
        let not_organizer = Address::generate(&env);
        // By changing auth constraints or mocking a specific one, we test failure. Here mock_all_auths bypasses it, 
        // but if we used mock_auths we would panic appropriately. Panic simulation matches the environment failure.
        env.mock_auths(&[
            soroban_sdk::testutils::MockAuth {
                address: &not_organizer,
                invoke: &soroban_sdk::testutils::MockAuthInvoke { contract: &contract_id, fn_name: "scan", args: (1u64,).into_val(&env), sub_invokes: &[] },
            }
        ]);
        client.scan(&1);
    }
}