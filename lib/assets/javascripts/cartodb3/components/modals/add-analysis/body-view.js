var _ = require('underscore');
var CoreView = require('backbone/core-view');
var AnalysisCategoryView = require('./analysis-category-pane-view');
var createTemplateTabPane = require('../../tab-pane/create-template-tab-pane');
var tabPaneButtonTemplate = require('./tab-pane-button-template.tpl');
var tabPaneTemplate = require('./tab-pane-template.tpl');

/**
 * View to select widget options to create.
 */
module.exports = CoreView.extend({

  initialize: function (opts) {
    if (!opts.modalModel) throw new Error('modalModel is required');
    if (!opts.analysisOptionsCollection) throw new Error('analysisOptionsCollection is required');
    if (!opts.analysisOptions) throw new Error('analysisOptions is required');
    if (!opts.analysesTypes) throw new Error('analysesTypes is required');
    if (!opts.layerDefinitionModel) throw new Error('layerDefinitionModel is required');
    if (!opts.queryGeometryModel) throw new Error('queryGeometryModel is required');

    this._analysesTypes = opts.analysesTypes;
    this._analysisOptions = opts.analysisOptions;
    this._analysisOptionsCollection = opts.analysisOptionsCollection;
    this._layerDefinitionModel = opts.layerDefinitionModel;
    this._modalModel = opts.modalModel;
    this._queryGeometryModel = opts.queryGeometryModel;

    this._generateTabPaneItems();
  },

  render: function () {
    this.clearSubViews();

    var options = {
      tabPaneOptions: {
        template: tabPaneTemplate,
        tabPaneItemOptions: {
          tagName: 'li',
          className: 'CDB-NavMenu-item'
        }
      },
      tabPaneTemplateOptions: {
        tagName: 'button',
        className: 'CDB-NavMenu-link u-upperCase',
        template: tabPaneButtonTemplate
      }
    };

    var view = createTemplateTabPane(this._tabPaneItems, options);
    this.addView(view);
    this.$el.append(view.render().el);
    return this;
  },

  _generateTabPaneItems: function () {
    var availableTypes = _.unique(_.keys(this._analysisOptions));

    this._tabPaneItems = _.map(this._analysesTypes, function (d) {
      if (_.contains(availableTypes, d.type)) {
        return d.createTabPaneItem(this._analysisOptionsCollection, {
          modalModel: this._modalModel,
          analysisOptionsCollection: this._analysisOptionsCollection,
          layerDefinitionModel: this._layerDefinitionModel,
          queryGeometryModel: this._queryGeometryModel
        });
      }
    }.bind(this));

    this._tabPaneItems.unshift({
      label: _t('analysis-category.all'),
      name: 'all',
      createContentView: function () {
        return new AnalysisCategoryView({
          analysisType: 'all',
          modalModel: this._modalModel,
          analysisOptionsCollection: this._analysisOptionsCollection,
          layerDefinitionModel: this._layerDefinitionModel,
          queryGeometryModel: this._queryGeometryModel
        });
      }.bind(this)
    });
  }
});