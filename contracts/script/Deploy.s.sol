// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {TANIToken} from "../src/TANIToken.sol";
import {TANIFaucet} from "../src/TANIFaucet.sol";
import {TaniTraceFunding} from "../src/TaniTraceFunding.sol";

contract Deploy is Script {
    function run() external returns (TANIToken token, TANIFaucet faucet, TaniTraceFunding funding) {
        string memory rawKey = vm.envOr("PRIVATE_KEY", string(""));
        require(bytes(rawKey).length != 0, "PRIVATE_KEY kosong: isi contracts/.env (lihat .env.example)");
        if (bytes(rawKey).length == 64) {
            rawKey = string.concat("0x", rawKey);
        }
        uint256 key = vm.parseUint(rawKey);
        uint256 allocation = vm.envOr("FAUCET_ALLOCATION", uint256(200_000));
        uint256 claimAmount = vm.envOr("FAUCET_CLAIM_AMOUNT", uint256(100));
        address deployer = vm.addr(key);

        vm.startBroadcast(key);
        token = new TANIToken();
        funding = new TaniTraceFunding(token);
        faucet = new TANIFaucet(token, claimAmount * 1 ether);
        token.transfer(address(faucet), allocation * 1 ether);
        vm.stopBroadcast();

        console2.log("TaniTrace v2 berhasil dideploy.");
        console2.log("  chainId          :", block.chainid);
        console2.log("  TANIToken        :", address(token));
        console2.log("  TaniTraceFunding :", address(funding));
        console2.log("  TANIFaucet       :", address(faucet));
        console2.log("  deployer         :", deployer);
        console2.log("  deployedAtBlock  :", block.number);

        string memory json = vm.serializeAddress("tanitrace", "token", address(token));
        json = vm.serializeAddress("tanitrace", "funding", address(funding));
        json = vm.serializeAddress("tanitrace", "faucet", address(faucet));
        json = vm.serializeAddress("tanitrace", "deployer", deployer);
        json = vm.serializeUint("tanitrace", "chainId", block.chainid);
        json = vm.serializeUint("tanitrace", "deployedAtBlock", block.number);
        string memory out = vm.envOr("DEPLOYMENT_OUT", string("../deployments/monadTestnet.json"));
        vm.writeJson(json, out);
        console2.log("  deployment file  :", out);
    }
}
