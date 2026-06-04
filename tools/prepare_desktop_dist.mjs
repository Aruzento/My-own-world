import fs from 'node:fs';
import path from 'node:path';


const ROOT =
  process.cwd();

const DIST_DIR =
  path.resolve(
    ROOT,
    'dist-desktop'
  );

const REQUIRED_ENTRIES = [
  'index.html',
  'presentation.html',
  'assets',
  'js',
  'styles'
];


main();


function main() {

  ensureSafeDistPath();
  recreateDistDirectory();

  REQUIRED_ENTRIES.forEach(entry => {

    copyEntry(
      path.join(ROOT, entry),
      path.join(DIST_DIR, entry)
    );
  });

  writeBuildManifest();

  console.log(
    `Desktop frontend готов: ${path.relative(ROOT, DIST_DIR)}`
  );
}


function ensureSafeDistPath() {

  const relative =
    path.relative(
      ROOT,
      DIST_DIR
    );

  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {

    throw new Error(
      'dist-desktop должен находиться внутри workspace проекта.'
    );
  }
}


function recreateDistDirectory() {

  if (
    fs.existsSync(
      DIST_DIR
    )
  ) {

    fs.rmSync(
      DIST_DIR,
      {
        recursive: true,
        force: true
      }
    );
  }

  fs.mkdirSync(
    DIST_DIR,
    {
      recursive: true
    }
  );
}


function copyEntry(
  source,
  target
) {

  if (!fs.existsSync(source)) {

    throw new Error(
      `Не найден обязательный desktop asset: ${path.relative(ROOT, source)}`
    );
  }

  const stats =
    fs.statSync(
      source
    );

  if (stats.isDirectory()) {

    copyDirectory(
      source,
      target
    );

    return;
  }

  fs.mkdirSync(
    path.dirname(target),
    {
      recursive: true
    }
  );

  fs.copyFileSync(
    source,
    target
  );
}


function copyDirectory(
  source,
  target
) {

  fs.mkdirSync(
    target,
    {
      recursive: true
    }
  );

  fs.readdirSync(
    source,
    {
      withFileTypes: true
    }
  )
    .forEach(entry => {

      copyEntry(
        path.join(source, entry.name),
        path.join(target, entry.name)
      );
    });
}


function writeBuildManifest() {

  const manifest = {
    generatedAt:
      new Date().toISOString(),
    entries:
      REQUIRED_ENTRIES
  };

  fs.writeFileSync(
    path.join(DIST_DIR, 'desktop-build-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );
}
