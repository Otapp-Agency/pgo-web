'use client';

import { useState } from 'react';
import { PlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';

import { NewMerchantForm } from './new-merchant-form';

export function NewMerchantDrawer() {
    const [open, setOpen] = useState(false);

    const handleSuccess = () => {
        setOpen(false);
    };

    return (
        <Drawer direction="right" open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Button>
                    <PlusIcon className="h-4 w-4" />
                    Add Merchant
                </Button>
            </DrawerTrigger>
            <DrawerContent className="h-full max-h-screen">
                <DrawerHeader className="border-b">
                    <DrawerTitle>Create New Merchant</DrawerTitle>
                    <DrawerDescription>
                        Fill in the details below to register a new merchant.
                    </DrawerDescription>
                </DrawerHeader>
                <div className="flex-1 overflow-y-auto p-4">
                    <NewMerchantForm onSuccess={handleSuccess} />
                </div>
                <div className="border-t p-4">
                    <DrawerClose asChild>
                        <Button variant="outline" className="w-full">Cancel</Button>
                    </DrawerClose>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

