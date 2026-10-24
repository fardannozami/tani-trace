// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {TANIToken} from "../src/TANIToken.sol";

contract Deploy is Script {
    function run() external returns (TANIToken token) {
        string memory rawKey = vm.envOr("PRIVATE_KEY", string(""));
        require(bytes(rawKey).length != 0, "PRIVATE_KEY kosong: isi contracts/.env (lihat .env.example)");
        if (bytes(rawKey).length == 64) {
            rawKey = string.concat("0x", rawKey);
        }
        uint256 key = vm.parseUint(rawKey);
        address deployer = vm.addr(key);

        vm.startBroadcast(key);
        token = new TANIToken();
        vm.stopBroadcast();

        console2.log("TaniTrace v3 (all-in-one) berhasil dideploy.");
        console2.log("  network       : Monad Testnet (chainId 10143)");
        console2.log("  TANIToken     :", address(token));
        console2.log("  Symbol        : TNC");
        console2.log("  Deployer      :", deployer);
        console2.log("  deployedAtBlock :", block.number);

        string memory json = vm.serializeAddress("tanitrace", "token", address(token));
        json = vm.serializeAddress("tanitrace", "deployer", deployer);
        json = vm.serializeUint("tanitrace", "chainId", block.chainid);
        json = vm.serializeUint("tanitrace", "deployedAtBlock", block.number);
        string memory out = vm.envOr("DEPLOYMENT_OUT", string("../deployments/monadTestnet.json"));
        vm.writeJson(json, out);
        console2.log("  deployment file :", out);
    }
}
