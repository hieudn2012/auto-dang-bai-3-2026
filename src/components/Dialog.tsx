'use client'

import React from 'react'
import { Dialog as Modal, DialogBackdrop, DialogPanel } from '@headlessui/react'

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Dialog({ open, onClose, children }: Props) {
  return (
    <div>
      <Modal open={open} onClose={onClose} className="relative z-10">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/70 dark:bg-black/80 backdrop-blur-sm transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-2xl bg-white/95 dark:bg-dark-bgSecondary/95 backdrop-blur-xl text-left shadow-2xl dark:shadow-black/50 outline -outline-offset-1 outline-white/20 dark:outline-dark-accent/20 transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-[1200px] data-closed:sm:translate-y-0 data-closed:sm:scale-95 border border-gray-200/50 dark:border-dark-border/50"
            >
              {children}
            </DialogPanel>
          </div>
        </div>
      </Modal>
    </div>
  )
}
