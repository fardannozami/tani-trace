"use client";
import { http, createConfig } from "wagmi";
import { injected } from "@wagmi/core";
import { monadTestnet } from "./chain";
export const config = createConfig({ chains: [monadTestnet], connectors: [injected()], transports: { [monadTestnet.id]: http() } });
