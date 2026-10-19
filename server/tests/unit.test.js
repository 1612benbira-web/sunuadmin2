import test from 'node:test';
import assert from 'node:assert/strict';
import { verifierTransition } from '../src/services/workflow.js';
import { detectType } from '../src/services/storage.js';
test('rejet sans motif refusé (422)', () => assert.equal(verifierTransition('EN_COURS', 'REJETE', 'AGENT', '').code, 422));
test('transition interdite (409)', () => assert.equal(verifierTransition('ACCEPTE', 'EN_COURS', 'ADMIN', 'x').code, 409));
test('citoyen ne peut pas accepter (403)', () => assert.equal(verifierTransition('EN_COURS', 'ACCEPTE', 'CITOYEN').code, 403));
test('agent peut compléter avec motif', () => assert.ok(verifierTransition('EN_COURS', 'COMPLEMENT_REQUIS', 'AGENT', 'pièce illisible').ok));
test('signature PDF reconnue, texte refusé', () => { assert.equal(detectType(Buffer.from('%PDF-1.4')), 'application/pdf'); assert.equal(detectType(Buffer.from('<script>')), undefined); });
