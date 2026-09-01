import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 disabled:cursor-default [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_-2px_var(--color-primary)/35] hover:shadow-[0_2px_4px_rgba(0,0,0,0.10),0_8px_20px_-4px_var(--color-primary)/45] hover:-translate-y-px active:translate-y-0 active:shadow-none',
        destructive:
          'bg-gradient-to-b from-destructive to-destructive/90 text-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_-2px_var(--color-destructive)/35] hover:shadow-[0_2px_4px_rgba(0,0,0,0.10),0_8px_20px_-4px_var(--color-destructive)/45] hover:-translate-y-px active:translate-y-0',
        outline:
          'bg-primary-soft text-primary-soft-foreground border border-primary/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-primary-soft/70 hover:border-primary/40 hover:shadow-[0_2px_6px_-1px_var(--color-primary)/20] active:shadow-none',
        secondary:
          'bg-secondary text-secondary-foreground border border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-secondary/70 hover:shadow-[0_2px_6px_-1px_rgba(0,0,0,0.08)] active:shadow-none',
        ghost:
          'text-muted-foreground hover:bg-primary-soft hover:text-primary-soft-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
