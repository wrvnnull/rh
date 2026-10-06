'use client';
import {createPublicClient,http} from 'viem'; import {robinhoodTestnet} from './config'; export const client=createPublicClient({chain:robinhoodTestnet,transport:http(robinhoodTestnet.rpcUrls.default.http[0])});
