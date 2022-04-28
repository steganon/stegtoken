# Intro
This is an implementation of an allowlist for buying an ERC-20 token. The allow list is also reusable so that multiple drops may be performed.

# Intent
ArtBlocks does not have a concept of a "whitelist", but I'd like to provide some people with early access to my projects.


I plan to:
* publish my own ERC-20 token (the SteganonToken contract) 
* allow some users to buy that token (through my StegMarket contract) which can then be used to purchase an ERC-721 from Art Blocks.


Having this contract be reusable is important so that I can also use it on future drops with a different access list.

# Problems
NOTE: If all data in tree is the same on subsequent tries, the merkle root will be the same.
      This will cause users that have already claimed to be blocked for the round!

My Workaround: Add an entry for the burn wallet, and simply increment it for each new drop as a versioning system.
See the last entry in config.json


# Install
npm install

# Generate the merkle tree (pre-created in merkle.json)
npm run gen

# Test the token contract and Market contract
npx hardhat test
