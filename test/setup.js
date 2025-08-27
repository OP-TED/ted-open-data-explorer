/**
 * Test setup for Node.js testing environment
 */

import { JSDOM } from 'jsdom'

// Set up minimal DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')

global.window = dom.window
global.document = dom.window.document
global.encodeURIComponent = encodeURIComponent