
import React from 'react';

export function TableWrap({ children }: { children: React.ReactNode }) {
 return <div className="overflow-x-auto">{children}</div>;
}

export function THead({ children }: { children: React.ReactNode }) {
 return <thead className="text-xs uppercase tracking-wide text-zinc-400">{children}</thead>;
}

export function TBody({ children }: { children: React.ReactNode }) {
 return <tbody className="[&>tr>td]:py-1 [&>tr>td]:px-2 text-sm leading-[1.25]">{children}</tbody>;
}
