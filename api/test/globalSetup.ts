import dotenv from 'dotenv';
import path from 'node:path';
import { BASE_TEST, archivosBase, recrearBase } from './helpers/db';

export default async function setup(): Promise<void> {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  await recrearBase(BASE_TEST, archivosBase());
}
