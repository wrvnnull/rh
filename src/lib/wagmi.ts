'use client';
import {createConfig,http} from 'wagmi'; import {injected} from 'wagmi/connectors'; import {robinhoodTestnet} from './config';
export const config=createConfig({chains:[robinhoodTestnet],connectors:[injected()],transports:{[robinhoodTestnet.id]:http(robinhoodTestnet.rpcUrls.default.http[0])}});
