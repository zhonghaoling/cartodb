var Backbone = require('backbone');
var ConfigModel = require('../../../../javascripts/cartodb3/data/config-model');
var QuerySchemaModel = require('../../../../javascripts/cartodb3/data/query-schema-model');

describe('data/query-schema-model', function () {
  beforeEach(function () {
    this.xhrSpy = jasmine.createSpyObj('xhr', ['abort', 'always', 'fail']);
    spyOn(Backbone.Model.prototype, 'sync').and.returnValue(this.xhrSpy);
    spyOn(Backbone.Model.prototype, 'fetch').and.callThrough();

    var configModel = new ConfigModel({
      base_url: '/u/pepe',
      api_key: 'xyz123'
    });
    this.modelOpts = {
      configModel: configModel
    };
    this.model = new QuerySchemaModel(null, this.modelOpts);
  });

  describe('when there is no query set initially', function () {
    it('should be unavailable by default', function () {
      expect(this.model.get('status')).toEqual('unavailable');
    });

    it('should not allow to fetch', function () {
      expect(this.model.fetch());
      expect(Backbone.Model.prototype.fetch).not.toHaveBeenCalled();
    });
  });

  it('should setup status according to given query and status attrs when model is created', function () {
    this.model = new QuerySchemaModel({query: 'SELECT * FROM foobar'}, this.modelOpts);
    expect(this.model.get('status')).toEqual('unfetched', 'since have a query that can be fetched');

    this.model = new QuerySchemaModel({
      status: 'fetched',
      query: 'SELECT * FROM foobar'
    }, this.modelOpts);
    expect(this.model.get('status')).toEqual('fetched', 'should match given value from when model was created');
  });

  describe('.resetDueToAlteredData', function () {
    it('should change status, trigger an event and fetch', function () {
      var spyObj = jasmine.createSpy('resetDueToAlteredData');
      spyOn(this.model, 'fetch');
      this.model.bind('resetDueToAlteredData', spyObj);
      this.model.resetDueToAlteredData();
      expect(this.model.get('status')).toBe('unfetched');
      expect(this.model.fetch).toHaveBeenCalled();
      expect(spyObj).toHaveBeenCalled();
    });
  });

  describe('when a query is changed', function () {
    beforeEach(function () {
      this.model.set('query', 'SELECT * FROM foo');
    });

    it('should update status accordingly', function () {
      expect(this.model.get('status')).toEqual('unfetched');

      this.model.unset('query');
      expect(this.model.get('status')).toEqual('unavailable');
    });
  });

  describe('.fetch', function () {
    beforeEach(function () {
      this.model.set('query', 'SELECT * FROM foo');
    });

    describe('when called with default', function () {
      beforeEach(function () {
        this.model.fetch();
      });

      it('should fetch with a wrapped query', function () {
        expect(Backbone.Model.prototype.fetch).toHaveBeenCalled();
        expect(Backbone.Model.prototype.fetch.calls.argsFor(0)[0].data.q).toMatch(/^SELECT \* FROM.+$/);
        expect(Backbone.Model.prototype.fetch.calls.argsFor(0)[0].data.q).toMatch(/FROM \(.+\) .+$/);
      });

      it('should use default request params', function () {
        expect(Backbone.Model.prototype.fetch.calls.argsFor(0)[0].data.rows_per_page).toBe(0);
        expect(Backbone.Model.prototype.fetch.calls.argsFor(0)[0].data.page).toBe(0);
        expect(Backbone.Model.prototype.fetch.calls.argsFor(0)[0].data.sort_order).toBe('asc');
      });

      it('should fetch using an API key', function () {
        expect(Backbone.Model.prototype.fetch.calls.argsFor(0)[0].data.api_key).toEqual('xyz123');
      });

      it('should change status', function () {
        expect(this.model.get('status')).toEqual('fetching');
      });

      describe('when a request is already ongoing', function () {
        beforeEach(function () {
          this.model.fetch();
        });

        it('should cancel current request', function () {
          expect(this.xhrSpy.abort).toHaveBeenCalled();
        });

        it('should fetch again', function () {
          expect(Backbone.Model.prototype.fetch.calls.count()).toEqual(2);
        });
      });

      describe('when request succeeds', function () {
        beforeEach(function () {
          Backbone.Model.prototype.sync.calls.argsFor(0)[2].success({
            fields: {
              cartodb_id: {type: 'number'},
              title: {type: 'string'},
              the_geom: {type: 'geometry'}
            },
            rows: []
          });
        });

        it('should change status', function () {
          expect(this.model.get('status')).toEqual('fetched');
        });

        it('should reset columns', function () {
          expect(this.model.columnsCollection.pluck('name')).toEqual(['cartodb_id', 'title', 'the_geom']);
        });
      });

      describe('when request fails', function () {
        beforeEach(function () {
          Backbone.Model.prototype.sync.calls.argsFor(0)[2].error({
            responseText: '{"error": ["meh"]}'
          });
        });

        it('should have unavailable status', function () {
          expect(this.model.get('status')).toEqual('unavailable');
        });
      });
    });

    describe('when called with custom attrs set', function () {
      beforeEach(function () {
        this.model.set({
          page: 1,
          rows_per_page: 40,
          sort_order: 'desc'
        });
        this.model.fetch();
      });

      it('should use custom request params', function () {
        this.model.set({
          page: 1,
          rows_per_page: 40,
          sort_order: 'desc'
        });

        this.model.fetch();
        expect(Backbone.Model.prototype.fetch).toHaveBeenCalled();
        expect(Backbone.Model.prototype.fetch.calls.argsFor(0)[0].data.rows_per_page).toEqual(40, 'should use custom amount');
        expect(Backbone.Model.prototype.fetch.calls.argsFor(0)[0].data.page).toEqual(1, 'should use custom page');
        expect(Backbone.Model.prototype.fetch.calls.argsFor(0)[0].data.sort_order).toEqual('desc', 'should use custom order');
      });

      describe('when request succeeds', function () {
        beforeEach(function () {
          Backbone.Model.prototype.sync.calls.argsFor(0)[2].success({
            fields: {
              cartodb_id: {type: 'number'},
              title: {type: 'string'},
              the_geom: {type: 'geometry'}
            },
            rows: [
              { cartodb_id: 1, title: '1st', the_geom: '0101000020E6100000694C88B9A4AA0DC0FD4FFEEE1D354440' },
              { cartodb_id: 2, title: '2nd', the_geom: '0101000020E6100000694C88B9A4AA0DC0FD4FFEEE1D354440' },
              { cartodb_id: 3, title: '3rd', the_geom: '0101000020E6100000694C88B9A4AA0DC0FD4FFE' }
            ]
          });
        });

        it('should change status', function () {
          expect(this.model.get('status')).toEqual('fetched');
        });

        it('should reset columns', function () {
          expect(this.model.columnsCollection.pluck('name')).toEqual(['cartodb_id', 'title', 'the_geom']);
        });

        it('should reset rows', function () {
          expect(this.model.rowsCollection.pluck('title')).toEqual(['1st', '2nd', '3rd']);
        });
      });
    });
  });

  describe('.destroy', function () {
    beforeEach(function () {
      this.destroySpy = jasmine.createSpy('destroy');
      this.model.once('destroy', this.destroySpy);

      this.model.destroy();
    });

    it('should do default destroy process to cleanup bindings', function () {
      expect(this.destroySpy).toHaveBeenCalled();
    });
  });
});
