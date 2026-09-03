"use client";

import { useEffect } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess, type PlaidLinkOnExit } from "react-plaid-link";

interface PlaidLinkLauncherProps {
  token: string;
  onSuccess: PlaidLinkOnSuccess;
  onExit?: PlaidLinkOnExit;
}

// Mounted only once a link token exists (see ConnectPlaidButton) — usePlaidLink
// needs the token up front, so this has to be a separate component from the
// button that fetches it rather than conditionally calling the hook inline.
export function PlaidLinkLauncher({ token, onSuccess, onExit }: PlaidLinkLauncherProps) {
  const { open, ready } = usePlaidLink({ token, onSuccess, onExit });

  useEffect(() => {
    if (ready) open();
  }, [ready, open]);

  return null;
}
