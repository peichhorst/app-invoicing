"use client";
import SettingsTabs from './SettingsTabs';
import type { SettingsTabsProps } from './SettingsTabs';

export default function SettingsTabsWrapper(props: SettingsTabsProps) {
  return <SettingsTabs {...props} />;
}
