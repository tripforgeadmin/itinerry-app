"use client";

import { ChoiceScreen } from "@/components/screens/ChoiceScreen";
import type { ScreenProps } from "@/components/screens/types";

/** Travel-expenses (q29) — generic choice rows with no emoji icons (document/screening range). */
export function ExpensesScreen(props: ScreenProps) {
  return <ChoiceScreen {...props} hideIcons />;
}
