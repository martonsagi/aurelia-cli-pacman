"use strict";

const UI = require('../../aurelia-cli/lib/ui'),
        CLIOptions = require('aurelia-cli').CLIOptions;

let CliBridge = class {
    constructor() {
        this.ui = new UI.ConsoleUI(new CLIOptions());
    }
};

module.exports = CliBridge;