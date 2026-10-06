import './globals.css';
import type { Metadata } from 'next';
import Providers from './providers';
export const metadata: Metadata={title:'Robinhood Launchpad','description':'Launchpad token list and bonding curve trading'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>}
