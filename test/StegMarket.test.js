const { expect } = require("chai");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const fs = require('fs');
const rawconfig = fs.readFileSync('config.json');
const config = JSON.parse(rawconfig);
const version = config.version;

function generateLeaf(address,value) {
  return Buffer.from(
    // Hash in appropriate Merkle format
    ethers.utils
      .solidityKeccak256(["address","uint256"], [address, value])
      .slice(2),
    "hex"
  );
}

// Setup merkle tree
const merkleTree = new MerkleTree(
  // Generate leafs
  Object.entries(config.airdrop).map(([address, tokens]) =>
    generateLeaf(
      ethers.utils.getAddress(address),
      ethers.utils.parseUnits(tokens.toString(), config.decimals).toString()
    )
  ),
  // Hashing function
  keccak256,
  { sortPairs: true }
);


describe("StegMarket", ()=> {
  let stegToken;
  let dex;
  let owner;
  let addr1;
  let addr2;
  let root = merkleTree.getHexRoot();
  let amt = ethers.utils.parseEther(".25");
  let proof1;

  beforeEach(async()=>{
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    proof1 = merkleTree.getHexProof(ethers.utils.solidityKeccak256(["address","uint256"], [addr1.address, amt]));
    const Token = await ethers.getContractFactory("SteganonToken");
    const StegMarket = await ethers.getContractFactory("StegMarket");
    stegToken = await Token.deploy(1000000);
    dex = await StegMarket.deploy(stegToken.address,"0x9cf39609f4d61c7de3b813375f4034c5a10b9cfd0c1d9842c61913fcc566828b");
    await stegToken.connect(owner).transfer(dex.address,ethers.utils.parseEther("100."));
  });

  it("Contract should have 100 & owner should have balance", async function() {
    let balance = await stegToken.balanceOf(dex.address);
    let balance2 = await stegToken.balanceOf(owner.address);
    expect(balance).to.equal(ethers.utils.parseEther("100."));
    expect(balance2).to.equal(ethers.utils.parseEther("999900."));
  });

  it("Test correct balances", async function() {

    await dex.connect(addr1).buy(proof1,{value:amt})

    let tokbalance = await stegToken.balanceOf(dex.address);
    let ethbalance = await waffle.provider.getBalance(dex.address);
    expect(tokbalance).to.equal(ethers.utils.parseEther("99.75"));
    expect(ethbalance).to.equal(amt);
  });

  it("Deny invalid addr", async function() {
    const proof = merkleTree.getHexProof(ethers.utils.solidityKeccak256(["address","uint256"], [addr2.address, amt]));

    await expect(dex.connect(addr2).buy(proof,{value:amt}))
      .to.be.revertedWith('Not on list or invalid claim amount')
  });

  it("Deny invalid claim", async function() {
    const proof = merkleTree.getHexProof(ethers.utils.solidityKeccak256(["address","uint256"], [addr1.address, amt]));

    let amt50 = ethers.utils.parseEther(".5");
    await expect(dex.connect(addr2).buy(proof,{value:amt50}))
      .to.be.revertedWith('Not on list or invalid claim amount')
  });

  it("Deny when AlreadyClaimed", async function() {

    await(dex.connect(addr1).buy(proof1,{value:amt}))
    
    await expect(dex.connect(addr1).buy(proof1,{value:amt}))
      .to.be.revertedWith('Already Claimed');
  });

  it("Allow onlyOwner withdraw", async function() {

    await dex.connect(addr1).buy(proof1,{value:amt})

    await dex.connect(owner).withdrawTo(owner.address)
  });

  it("Allow onlyOwner withdraw token", async function() {

    await dex.connect(addr1).buy(proof1,{value:amt})

    let tokbalance = await stegToken.balanceOf(dex.address);
    await dex.connect(owner).withdrawTokenTo(owner.address,stegToken.address,tokbalance)
  });
  it("Allow onlyOwner withdraw token to other addr", async function() {

    await dex.connect(addr1).buy(proof1,{value:amt})

    let tokbalance = await stegToken.balanceOf(dex.address);
    await dex.connect(owner).withdrawTokenTo(addr2.address,stegToken.address,tokbalance)
  });
  it("Canbuy", async function() {
    let canbuy = await dex.connect(addr1).canBuy(addr1.address,proof1,amt)
    expect(canbuy).to.equal(true);
    await(dex.connect(addr1).buy(proof1,{value:amt}))
    canbuy = await dex.connect(addr1).canBuy(addr1.address,proof1,amt)
    expect(canbuy).to.equal(false);
    console.log(dex.functions);
  });
});
