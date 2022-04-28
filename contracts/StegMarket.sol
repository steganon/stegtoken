// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


/*
 * This is an implementation of an allowlist for buying an ERC-20 token.
 * The contract will hold a given amount of the token, but only the allowed wallets 
 * will be able to buy (for a 1:1 exchange rate.)
 *
 * It is also reusable: Generate a new tree and change the root with resetList().
 *
 * NOTE: If all data in tree is the same on subsequent tries, the merkle root will be the same.
 *       This will cause users that have already claimed to be blocked for the round!
 *
 * Workaround: Add an entry for the burn wallet, and simply increment it for each new drop as a versioning system.
 *
 */
contract StegMarket is Pausable, Ownable {
  using SafeERC20 for IERC20;

  IERC20 public immutable stegToken;
  bytes32 public merkleRoot;
  mapping(address => mapping(bytes32 => bool)) public hasClaimed;

  constructor(
        address _tok,
        bytes32 _merkleRoot
  ) {
        stegToken = IERC20(_tok);
        merkleRoot = _merkleRoot;
  }

  /*
   * Change the merkle root. This will automatically invalidate 
   * a previous claim list and replace it with a new one.
   */
  function resetList(bytes32 _merkleRoot) onlyOwner public {
    merkleRoot = _merkleRoot;
  }

  /*
   * Allow a specific list of wallets to buy a specific amount of tokens
   * for a 1:1 exchange rate. 
   */
  function buy(bytes32[] calldata proof) payable public whenNotPaused {
    require(!hasClaimed[msg.sender][merkleRoot], "Already Claimed");

    require(msg.value <= stegToken.balanceOf(address(this)), "Not enough tokens in DEX");

    bytes32 leaf = keccak256(abi.encodePacked(msg.sender,msg.value));
    require(MerkleProof.verify(proof, merkleRoot, leaf), "Not on list or invalid claim amount");

    hasClaimed[msg.sender][merkleRoot] = true;
    stegToken.transfer(msg.sender, msg.value);
  }

  function canBuy(address to, bytes32[] calldata proof, uint256 amount) public view returns (bool) {
    if(hasClaimed[to][merkleRoot]) return false;
    require(amount <= stegToken.balanceOf(address(this)), "Not enough tokens in DEX");
    bytes32 node = keccak256(abi.encodePacked(to,amount));
    return MerkleProof.verify(proof, merkleRoot, node);
  }

  function withdrawTo(address payable _to) public onlyOwner {
    _to.transfer(address(this).balance);
  }

  function withdrawTokenTo(address _to, address _tokContract, uint256 amt) public onlyOwner {
    IERC20(_tokContract).safeTransfer(_to, amt);
  }
}
