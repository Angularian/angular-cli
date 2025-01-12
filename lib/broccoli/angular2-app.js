var TypescriptTree = require('./broccoli-typescript').default;
var configReplace = require('./broccoli-config-replace');
var mergeTrees = require('broccoli-merge-trees');
var Funnel = require('broccoli-funnel');
var Project = require('ember-cli/lib//models/project');
var Concat = require('broccoli-concat');

module.exports = Angular2App;

function Angular2App() {
    this._initProject();
    this._notifyAddonIncluded();
}

Angular2App.prototype.toTree = function () {
    var sourceTree = 'src';

    var tsTree = new TypescriptTree(sourceTree, {
        allowNonTsExtensions: false,
        declaration: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        mapRoot: '',           // force sourcemaps to use relative path
        noEmitOnError: true,
        rootDir: '.',
        sourceMap: true,
        sourceRoot: '.',
        target: 'ES5',
        module: 4 /* System */
    });

    var jsTree = new Funnel(sourceTree, {
        include: ['**/*.js'],
        allowEmpty: true
    });

    var cssTree = new Funnel(sourceTree, {
        include: ['**/*.css'],
        allowEmpty: true
    });

    var htmlTree = new Funnel(sourceTree, {
        include: ['**/*.html'],
        allowEmpty: true
    });

    var appJs = new Concat(mergeTrees([tsTree, jsTree]), {
        inputFiles: [
            '*.js',
            '**/*.js'
        ],
        outputFile: '/app.js'
    });

    return mergeTrees([appJs, cssTree, htmlTree, this.index()], { overwrite: true });
};

/**
 @private
 @method _initProject
 @param {Object} options
 */
Angular2App.prototype._initProject = function() {
    this.project = Project.closestSync(process.cwd());

    /*if (options.configPath) {
        this.project.configPath = function() { return options.configPath; };
    }*/
};

/**
 @private
 @method _notifyAddonIncluded
 */
Angular2App.prototype._notifyAddonIncluded = function() {
    this.initializeAddons();
    this.project.addons = this.project.addons.filter(function(addon) {
        addon.app = this;

        if (!addon.isEnabled || addon.isEnabled()) {
            if (addon.included) {
                addon.included(this);
            }

            return addon;
        }
    }, this);
};

/**
 Loads and initializes addons for this project.
 Calls initializeAddons on the Project.

 @private
 @method initializeAddons
 */
Angular2App.prototype.initializeAddons = function() {
    this.project.initializeAddons();
};

/**
 Returns the content for a specific type (section) for index.html.

 Currently supported types:
 - 'head'
 //- 'config-module'
 //- 'app'
 //- 'head-footer'
 //- 'test-header-footer'
 //- 'body-footer'
 //- 'test-body-footer'

 Addons can also implement this method and could also define additional
 types (eg. 'some-addon-section').

 @private
 @method contentFor
 @param  {RegExP} match  Regular expression to match against
 @param  {String} type   Type of content
 @return {String}        The content.
 */
Angular2App.prototype.contentFor = function(match, type) {
    var content = [];

    /*switch (type) {
        case 'head':          this._contentForHead(content, config);         break;
        case 'config-module': this._contentForConfigModule(content, config); break;
        case 'app-boot':      this._contentForAppBoot(content, config);      break;
    }*/

    content = this.project.addons.reduce(function(content, addon) {
        var addonContent = addon.contentFor ? addon.contentFor(type) : null;
        if (addonContent) {
            return content.concat(addonContent);
        }

        return content;
    }, content);


    return content.join('\n');
};

/**
 @private
 @method _configReplacePatterns
 @return
 */
Angular2App.prototype._configReplacePatterns = function() {
    return [/*{
        match: /\{\{EMBER_ENV\}\}/g,
        replacement: calculateEmberENV
    }, */{
        match: /\{\{content-for ['"](.+)["']\}\}/g,
        replacement: this.contentFor.bind(this)
    }/*, {
        match: /\{\{MODULE_PREFIX\}\}/g,
        replacement: calculateModulePrefix
    }*/];
};


/**
 Returns the tree for app/index.html

 @private
 @method index
 @return {Tree} Tree for app/index.html
 */
Angular2App.prototype.index = function() {
    var htmlName = 'index.html';
    var files = [
        'index.html'
    ];

    var index = new Funnel('src', {
        files: files,
        description: 'Funnel: index.html'
    });


    return configReplace(index, {
        files: [ htmlName ],
        patterns: this._configReplacePatterns()
    });
};