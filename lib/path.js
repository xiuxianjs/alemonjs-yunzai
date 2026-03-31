import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname$1 = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname$1, '..');
const PLUGINS_DIR = join(PACKAGE_ROOT, '..');

export { PACKAGE_ROOT, PLUGINS_DIR };
