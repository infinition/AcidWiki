#!/usr/bin/env node
// Verification de syntaxe du moteur : les scripts inline de index.html et tous les
// fichiers .js de wiki/. Sert de garde-fou rapide, sans navigateur.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;

function check(label, source) {
    try {
        new Function(source);
        console.log(`  ok   ${label}`);
    } catch (error) {
        failed++;
        console.error(`  FAIL ${label}: ${error.message}`);
    }
}

const html = readFileSync(join(root, 'index.html'), 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
blocks.forEach((match, index) => check(`index.html inline script #${index + 1}`, match[1]));

function walk(dir) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (name.endsWith('.js')) check(full.slice(root.length + 1), readFileSync(full, 'utf8'));
    }
}
walk(join(root, 'wiki'));

console.log(failed ? `\n${failed} file(s) failed.` : '\nAll files parsed.');
process.exit(failed ? 1 : 0);
