(function($, location, document, exports) {
  
  var view, router, model;
  
  // modernizr history test
  var historyAble = !!(window.history && history.pushState);
  
  (function() {
    // previous link support: https://github.com/mklabs/h5bp-docs/pull/5
    // doing it here to trigger this on non pushState able browsers too
    // we now prevent non pushState browsers from running the Backbone app
    // cause it may become tricky to deal with multiple location and so on 
    // (/docs/ vs /docs/The-style/)
    
    var text = location.hash.replace(/^#/,'');
    
    // if no hash in url, does nothing
    if(!text) return;
    
    var links = $('.wikiconvertor-pages a');
        
    // custom selector may be handy?
    // iterate through links and try to get a case unsensitive test with hash value
    var navlink = links.filter('a[href^="/docs/'+ text + '"]').map(function() {
      return !!this.href.match(new RegExp(text, 'i')) ? $(this).attr('href') : undefined;
    });
    
    // if navlink has elements, redirect to the first one
    if(navlink.length) location.href = navlink[0]; 
    
  })();
  
  // no backbone for non push state :(
  if(!historyAble) return;
  
  
  
  var DocsPage = Backbone.Model.extend({
    url: function url() {
      var path = this.get('path');
      return (/^\//.test(path) ? '' : '/') + this.get('path');
    },
    
    parse: function(resp, xhr) {
      var m = this.get('path').match(/docs\/([^\/]+)\//),
      title = m ? m[1].replace(/-/g, ' ') : 'Home';
      return {
        title: title,
        content: $(resp).find('.wikiconvertor-content').html()
      };
    },
    
    // provide a sync impl for our Page Model
    sync: function(method, model, options) {
      $.ajax($.extend(options, {
        dataType: 'html',
        url: this.url()
      }));
      return this;
    }
  });
  
  var DocsView = Backbone.View.extend({
    el: '#body',
    
    events: {
      'click .wikiconvertor-pages a': 'clickHandler'
    },
    
    initialize: function() {
      _.bindAll(this, 'clickHandler', 'addHdrAttr', 'addPermalinks');
      
      // re-render when model changes
      this.model.bind('change:content', _.bind(this.render, this));
      this.model.bind('change:title', _.bind(this.updateTitle, this));
      
      // few dom references
      this.placeholder = this.$('.wikiconvertor-content');
      this.scroller = this.options.scroll ? $('html,body') : undefined;
      this.active = this.$('.wikiconvertor-pages a[href="' + model.url() + '"]');
      this.active.closest('li').addClass('wikiconvertor-pages-active');
      
      // build headings and permalinks
      this.headings();
    },
    
    clickHandler: function clickHandler(e) {
      var target = $(e.target),
      url = target.closest('a').attr('href'),
      external = /\/\//.test(url),
      octothorpe = /#/.test(url);
      
      e.preventDefault();
      
      if(!external && !octothorpe) {
         this.active.closest('li').removeClass('wikiconvertor-pages-active');
         this.active = target.closest('li').addClass('wikiconvertor-pages-active');
         
         if(this.scroller) {
           this.scroller.animate({scrollTop: 0}, 500);           
         }

         router.navigate(url, true);
       }
    },
    
    headings: function headings(text) {
      // # or ...
      var t = text || location.hash.replace(/^#/,''),
      hdr = this.placeholder.find(':header'), h;

      // First thing first deal with headings and add proper data-wiki-hdr attribute
      hdr
        .each(this.addHdrAttr)
        .each(this.addPermalinks);

      if(!t || !hdr.length) {
        return;
      }

      h = hdr.filter('#' + t);

      if(!h.length) {
        return;
      }

      this.scroller.animate({scrollTop: h.offset().top}, 0);
    },
    
    addPermalinks: function(i, header) {
      var t = $(header),
      hdr  = t.attr('id');
      $('<span class="octothorpe"><a href="' + '#' + hdr + '">#</a></span>').appendTo(t);
    },

    addHdrAttr: function(i, header) {
      var t = $(header),
      text = t.text(),
      attr = text
        // First lower case all
        .toLowerCase()

        // Then replace any special character
        .replace(/[^a-z|A-Z|\d|\s|\-]/g, '')

        // Finally, replace all blank space by - delimiter                
        .replace(/\s/g, '-');

      t.attr('id', attr);
    },
    
    render: function render() {
      $(this.placeholder).html(this.model.get('content'));
      this.headings();
      return this;
    },
    
    updateTitle: function() {
      document.title = document.title.replace(/[^|]+|/, this.model.get('title') + ' ');
    }
  });
  
  var DocsRouter = Backbone.Router.extend({
    routes: {
      // catch all
      '*path': 'changePage'
    },
    
    changePage: function changePage(path) {
      if(!path || path === model.get('path')) {
        return;
      }
      
      model
        .set({ path: path })
        .fetch({
          success: function() {
            // notify disqus of the asycn page change
            window.DISQUS && DISQUS.reset({
              reload: true,
              config: function () {  
                this.page.identifier = this.page.url = location.pathname;
              }
            });
          }
        });
    }
  });
  
  $(function() {
    model = new DocsPage({path: location.pathname });
    view = new DocsView({model: model, scroll: true});
    router = new DocsRouter();
    
    Backbone.history.start({ 
      pushState: true
    });
  });
  
  
})(this.jQuery, this.location, this.document, this);