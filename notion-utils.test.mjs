import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSinglePropertyValue,
  findTitlePropertyName,
  getDatabaseTitle
} from './notion-utils.mjs';

test('getDatabaseTitle joins title fragments', () => {
  const db = { title: [{ plain_text: 'A' }, { plain_text: 'B' }] };
  assert.equal(getDatabaseTitle(db), 'AB');
});

test('findTitlePropertyName returns title property key', () => {
  const db = { properties: { Name: { type: 'title' }, Status: { type: 'select' } } };
  assert.equal(findTitlePropertyName(db), 'Name');
});

test('buildSinglePropertyValue handles number and invalid number', () => {
  assert.deepEqual(buildSinglePropertyValue('number', '12.5'), { number: 12.5 });
  assert.equal(buildSinglePropertyValue('number', 'x'), null);
});

test('buildSinglePropertyValue handles multi_select and empty values', () => {
  assert.deepEqual(buildSinglePropertyValue('multi_select', ['A', 'B']), {
    multi_select: [{ name: 'A' }, { name: 'B' }]
  });
  assert.equal(buildSinglePropertyValue('multi_select', []), null);
});

test('buildSinglePropertyValue handles rich_text/date', () => {
  assert.deepEqual(buildSinglePropertyValue('rich_text', 'hello'), {
    rich_text: [{ text: { content: 'hello' } }]
  });
  assert.deepEqual(buildSinglePropertyValue('date', '2026-01-01'), {
    date: { start: '2026-01-01' }
  });
});
