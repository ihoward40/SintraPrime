import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import yazl from 'yazl';

/**
 * Create a byte-stable ZIP by:
 * - adding files in stable order
 * - forcing a fixed mtime for each entry
 * - forcing a stable POSIX-like mode
 *
 * @param {{workspaceRoot: string, filesRel: string[], zipAbs: string, fixedDate: Date}} params
 */
export async function createDeterministicZip({ workspaceRoot, filesRel, zipAbs, fixedDate }) {
  await fs.mkdir(path.dirname(zipAbs), { recursive: true });

  const zipfile = new yazl.ZipFile();
  const output = fssync.createWriteStream(zipAbs);

  zipfile.outputStream.pipe(output);

  for (const relPosix of filesRel) {
    const abs = path.join(workspaceRoot, relPosix);
    zipfile.addFile(abs, relPosix, {
      mtime: fixedDate,
      mode: 0o100644,
      compress: true
    });
  }

  zipfile.end();
  await once(output, 'close');
}
