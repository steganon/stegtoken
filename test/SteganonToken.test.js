const { expect } = require("chai");

describe("SteganonToken", ()=> {
  let Token;
  let steg;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async()=>{
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    Token = await ethers.getContractFactory("SteganonToken");
    steg = await Token.deploy(1000000);
  });

  it("Should mint 1M tokens", async function() {
    let balance = await steg.balanceOf(owner.address);
    expect(await steg.totalSupply()).to.equal(balance);
  });
  
});

