"use client"
import React from 'react';
import { QueryClient , QueryClientProvider } from '@tanstack/react-query';

const Provider = ({children}) => {
    const queryClient = new QueryClient({
        defaultOptions:{
            queries:{
                refetchOnWindowFocus:false,
                retry:false,
                cacheTime:1000 * 60 * 15,  
            }
        }
    })
  return (
    <QueryClientProvider client={queryClient}>
        {children}
    </QueryClientProvider>
  )
}

export default Provider
