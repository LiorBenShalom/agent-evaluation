import { SharedConfig } from "@kaltura/services-common/shared-config";
import { setTimeout } from 'timers/promises';
import { styleText } from 'node:util';

export function capitalizeFirstLetter(str: string) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}


export async function welcomeMessage(appName: string, port: number): Promise<void> {
  if (!SharedConfig.localDev) {
    // eslint-disable-next-line no-console
    console.log(
      `${capitalizeFirstLetter(appName)} server is up 👉`,
      `http://localhost:${port}/api`,
    );
    return;
  }

  await setTimeout(500);
  // eslint-disable-next-line no-console
  console.log(
    '\n',
    styleText('green', `${capitalizeFirstLetter(appName)} server is up 👉`),
    `http://localhost:${port}/api`,
    '\n',
  );
}
