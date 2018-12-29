/**
 * @author chhuean <chhuean@163.com>
 * extensions:
 */

!function ($) {

    'use strict';

    var serializeJsonObject = function ($form) {
        var json = {};
        var form = $form.serializeArray();
        $.each(form, function () {
            if (json[this.name]) {
                if (!json[this.name].push) {
                    json[this.name] = [json[this.name]];
                }
                json[this.name].push();
            } else {
                json[this.name] = this.value || '';
            }
        });
        return json;
    };

    var calculateObjectValue = function (self, name, args, defaultValue) {
        var func = name;

        if (typeof name === 'string') {
            // support obj.func1.func2
            var names = name.split('.');

            if (names.length > 1) {
                func = window;
                $.each(names, function (i, f) {
                    func = func[f];
                });
            } else {
                func = window[name];
            }
        }
        if (typeof func === 'object') {
            return func;
        }
        if (typeof func === 'function') {
            return func.apply(self, args);
        }
        if (!func && typeof name === 'string' && sprintf.apply(this, [name].concat(args))) {
            return sprintf.apply(this, [name].concat(args));
        }
        return defaultValue;
    };

    $.extend($.fn.bootstrapTable.defaults, {
        searchToolbar: "",
        onMultipleSearch: function () {
            return false;
        }
    });

    $.extend($.fn.bootstrapTable.Constructor.EVENTS, {
        'multipleSearch.bs.table': 'onMultipleSearch'
    });

    var BootstrapTable = $.fn.bootstrapTable.Constructor,
        initToolbar = BootstrapTable.prototype.initToolbar,
        onSearch = BootstrapTable.prototype.onSearch,
        initServer = BootstrapTable.prototype.initServer,
        destroy = BootstrapTable.prototype.destroy;

    BootstrapTable.prototype.initToolbar = function () {
        var that = this;
        initToolbar.apply(this, Array.prototype.slice.apply(arguments));
        if (this.options.searchToolbar == undefined || this.options.searchToolbar == "") {
            return;
        }

        var $form = that.$searchToolbarForm = $("<form></form>");


        var $condition = $(this.options.searchToolbar);
        var list = $condition.children("div");
        list.addClass("search pull-right m-r-xs");



        var $search = list.find("input.condition");
        var $select = list.find("select.condition");
        var timeoutId = 0;

        $search.off('keyup drop').on('keyup drop', function (event) {
            clearTimeout(timeoutId); // doesn't matter if it's 0
            timeoutId = setTimeout(function () {
                that.onMultipleSearch(event);
            }, that.options.searchTimeOut);
        });

        $select.change(function (event) {
            that.onMultipleSearch(event);
        });

        $condition.appendTo($form);
        this.multipleData = serializeJsonObject($form);
        this.$toolbar.append($form);
    };

    BootstrapTable.prototype.onMultipleSearch = function (event) {
        var $obj = $(event.currentTarget);
        var name = $obj.attr("name");
        var text = $.trim($obj.val());

        // trim search input
        if ($obj.is("input") && this.options.trimOnSearch && $obj.val() !== text) {
            $obj.val(text);
        }
        if (this.multipleData[name] == text) {
            return;
        }

        this.multipleData[name] = text;
        this.options.pageNumber = 1;
        this.initSearch();
        this.updatePagination();
        this.trigger('multipleSearch', text, $obj);
    };

    BootstrapTable.prototype.initServer = function (silent, query) {
        var that = this,
            data = {},
            params = {
                pageSize: this.options.pageSize === this.options.formatAllRows() ?
                    this.options.totalRows : this.options.pageSize,
                pageNumber: this.options.pageNumber,
                searchText: this.searchText,
                sortName: this.options.sortName,
                sortOrder: this.options.sortOrder
            },
            request;

        if (!this.options.url && !this.options.ajax) {
            return;
        }

        if (this.options.queryParamsType === 'limit') {
            params = {
                search: params.searchText,
                sort: params.sortName,
                order: params.sortOrder
            };
            if (this.options.pagination) {
                params.limit = this.options.pageSize === this.options.formatAllRows() ?
                    this.options.totalRows : this.options.pageSize;
                params.offset = this.options.pageSize === this.options.formatAllRows() ?
                    0 : this.options.pageSize * (this.options.pageNumber - 1);
            }
        }

        if (!($.isEmptyObject(this.filterColumnsPartial))) {
            params['filter'] = JSON.stringify(this.filterColumnsPartial, null);
        }

        if (this.$searchToolbarForm) {
            $.extend(params, serializeJsonObject(this.$searchToolbarForm));
        }

        data = calculateObjectValue(this.options, this.options.queryParams, [params], data);

        $.extend(data, query || {});

        // false to stop request
        if (data === false) {
            return;
        }

        if (!silent) {
            this.$tableLoading.show();
        }
        request = $.extend({}, calculateObjectValue(null, this.options.ajaxOptions), {
            type: this.options.method,
            url: this.options.url,
            data: this.options.contentType === 'application/json' && this.options.method === 'post' ?
                JSON.stringify(data) : data,
            cache: this.options.cache,
            contentType: this.options.contentType,
            dataType: this.options.dataType,
            success: function (res) {
                res = calculateObjectValue(that.options, that.options.responseHandler, [res], res);

                that.load(res);
                that.trigger('load-success', res);
            },
            error: function (res) {
                that.trigger('load-error', res.status, res);
            },
            complete: function () {
                if (!silent) {
                    that.$tableLoading.hide();
                }
            }
        });

        if (this.options.ajax) {
            calculateObjectValue(this, this.options.ajax, [request], null);
        } else {
            $.ajax(request);
        }
    }

    BootstrapTable.prototype.destroy = function () {
        $(this.options.searchToolbar).insertBefore(this.$container);
        destroy.apply(this, Array.prototype.slice.apply(arguments));
    };
}(jQuery);