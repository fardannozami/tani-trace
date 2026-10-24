// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {TANIToken} from "../src/TANIToken.sol";
import {TANIFaucet} from "../src/TANIFaucet.sol";
import {TaniTraceFunding} from "../src/TaniTraceFunding.sol";

contract Deploy is Script {
    function run() external returns (TANIToken token, TANIFaucet faucet, TaniTraceFunding funding) {
        uint256 key = vm.envUint("PRIVATE_KEY"); uint256 allocation = vm.envOr("FAUCET_ALLOCATION", uint256(200_000));
        vm.startBroadcast(key); token = new TANIToken(); funding = new TaniTraceFunding(token); faucet = new TANIFaucet(token, 100 ether); token.transfer(address(faucet), allocation * 1 ether); vm.stopBroadcast();
        console2.log("TaniTrace v2 deployed on Monad Testnet (chainId 10143)"); console2.logAddress(address(token)); console2.logAddress(address(funding)); console2.logAddress(address(faucet));
    }
}
