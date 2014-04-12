/** @jsx React.DOM */
"use strict";

// Set up Google Analytics Tracking
(function(EAConfig) {
  if (EAConfig.profile === "prod") {
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                            m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
                            })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

    ga('create', 'UA-49130314-1', 'tumblr.com');
    ga('send', 'pageview');
  }
})(EAConfig);

// XXX - notice that +10? this function's name is a bit misleading.
(function($) {
  $.fn.scrollable = function() {
    return this.get(0).scrollHeight > this.innerHeight() + 10;
  }
}(jQuery));

$(function(){
  FastClick.attach(document.body);
}, false);

(function($, _, React, Router) {
  Number.prototype.mod = function(n) {
    return ((this % n) + n) % n;
  }

  var Settings = {
    galleryBreakpoint: 600,
    mediumBreakpoint: 900,

    isSmall: function() {
      return $(window).width() < this.mediumBreakpoint;
    }
  };


  /**
   * Internal Helpers
   */

  /*
   * Wraparound array get element
   */
  function getMod(array, i) {
    return array[i.mod(array.length)];
  }

  /**
   * Partition a `list` with int `partitions` partitions, with
   * `per` items per partition
   */
  function partition(list, per, partitions) {
    partitions = partitions || 2;

    var partitioned = [];
    for (var i = 0; i < partitions; i++) {
      partitioned[i] = [];
    }

    for (var i = 0; i * per < list.length; i++) {
      var p = i % partitions,
              ipos = i * per;
      partitioned[p] = partitioned[p].concat(list.slice(ipos, ipos + per));
    }

    return partitioned;
  }

  /*
   * A basic lock
   */
  function Lock() {
    var locked = false;

    this.lock = function() {
      if (locked) {
        return false;
      } else {
        locked = true;
        return true;
      }
    }

    this.release = function() {
      locked = false;
      return true;
    }

    this.withLock = function(f) {
      if (this.lock()) {
        var result = f();
        this.release()
        return result;
      } else {
        return false;
      }
    }

    return this;
  }


  /*
   * TumblrFetch -- Tumblr API Client
   */
  var TumblrUtils = {
    toImage: function(d) {
      return d.photos[0].alt_sizes[1];
    },

    toTags: function(post) {
      return _.map(post.tags, function(tag) {
        return {
          tag: tag,
          url: this.externalTagURL(tag)
        }
      }, this);
    },

    /**
     * Returns the tag for the current page, or none if not available
     */
    currentTag: function(pathname) {
      var matches = pathname.match(/\/tagged\/(.*)$/);
      if (matches) return matches[1];
    },

    externalTagURL: function(tag) {
      return "/tagged/" + tag;
    },

    internalPostURL: function(id) {
      return "#/posts/tumblr/" + id + "/instagram";
    },

    fetchAvatar: function(args) {
      var apiURL = "https://api.tumblr.com/v2";
      var params = $.param({callback: "?"});
      var url = apiURL + "/blog/" + args.source + "/avatar/" + args.size || 128;
      return $.ajax({url: url + "?" + params, dataType: "jsonp"});
    },

    instagramID: function(post) {
      return post.link_url.match(/http:\/\/instagram\.com\/p\/(.*)\//)[1];
    }
  };


  function TumblrFetch(config) {
    this.prototype = TumblrUtils;
    // The publically accessible list of tumblr items
    this.items = [];

    var API_KEY = "xIPlTUhKQUEnxFtWbL6A98VFRs8v0qHXSULaRbFuRX2GZnaHio";
    var API_URL = "https://api.tumblr.com/v2/blog/" + config.source;

    // How many posts to fetch per update
    var limit  = config.limit || 10;
    var offset = config.offset || 0;
    var tag    = config.tag || "everydayafrica";
    var type   = "photo";
    // The total number of posts, set on fetch
    var posts;

    var fetchLock = new Lock();

    function onFetchDone(d) {
      offset += limit;
      posts = d.posts;
      // Set publically accessible blog data
      if(!("blog" in this)) {
	this.blog = d.blog;
      }
      for (var i = 0; i < posts.length; i++) {
        this.items.push(posts[i]);
      }
    }

    this.fetchNext = function(args) {
      // Don't attempt to fetch if no more posts are available
      if (offset >= posts) return false;

      if(fetchLock.lock()) {
        var params = $.param({
          limit: limit,
          offset: offset,
          tag: config.tag,
          type: type,
          api_key: API_KEY,
          callback: "?"
        });

        var url = API_URL + "/posts?" + params;
        return $.ajax({url: url, dataType: "jsonp"})
          .then(function(d) { return d.response; })
          .done(onFetchDone.bind(this))
          .always(function() { fetchLock.release(); });
      } else {
        // console.log("LOCKED");
        return false;
      }
    };

    /*
     * External API
     */
    this.get = function(i) {
      return getMod(this.items, i);
    };

    this.take = function(n, index) {
      var taken = [], start = index || 0;
      for(var i = start; i < start + n; i++) {
        taken.push(this.get(i));
      }
      return taken;
    }

    return this;
  }

  /*
   * InstaFetch -- Instagram API Client
   *
   * Handles lazily fetching instagram images.
   */
  var InstaUtils = {
    /**
     * Extract the image data
     */
    toImage: function(d) {
      var img = d.images.low_resolution;
      return {
	id: d.id,
	url: img.url,
	width: img.width,
	height: img.height
      }
    }
  }

  function InstaFetch(o) {
    this.prototype = InstaUtils;
    this.tag   = "tag" in o ? o["tag"] : "everydayafrica";
    this.limit = "limit" in o ? o["limit"] : 20;

    var CLIENT_ID = "57dbff39f8dc4b659e6489ac6dd68b45";
    var API_URL   = "https://api.instagram.com/v1";
    var items = [];
    var pendingItems = [];
    var cache = {};

    /*
     * Internal Functions
     */
    function params() {
      return $.param({client_id: CLIENT_ID, callback: "?"});
    }

    function _resolve(deferred, item) {
      return deferred.resolveWith(this, [item]).promise();
    }

    function fetch(pendingDeferreds, url) {
      $.ajax({url: url, dataType: "jsonp"})
        .done(function(d) {
          _.each(d.data, function(item) {
            var deferred = pendingDeferreds.shift()
            if (deferred) {
              // Resolve it
              deferred.resolveWith(this, [item]);
              return true;
            } else {
              // If there are no more deferreds, queue up in pending
	      pendingItems.push(item);
            }
          }.bind(this));

          // Recur as necessary
          if (d.pagination.next_url && pendingDeferreds.length > 0) {
            fetch(pendingDeferreds, d.pagination.next_url);
          }
        }.bind(this))
        .fail(function(d) {
          console.log("Instagram API Fetch failed, retrying")
          setTimeout(function() {this._populate(remaining, url, index)}, 1000)
        }.bind(this));
      return this;
    }

    function flush(pendingDeferreds) {
      while (pendingItems.length > 0 && pendingDeferreds.length > 0) {
        pendingDeferreds.shift().resolveWith(this, [pendingItems.shift()]);
      }
      return this;
    }

    /*
     * External API
     */
    this.fetchNext = function(count) {
      var corrected = items.length + count >= this.limit ? this.limit - items.length : count;
      var newItems = [];

      // Set all of the deferreds
      _.times(corrected, function() {
        var deferred = $.Deferred().done(function (d) {
          // Add to the cache when done
          cache[d.id] = $.Deferred().resolveWith(this, [{data: d}]).promise();
        }.bind(this));
	newItems.push(deferred);
	items.push(deferred);
      }, this);

      return fetch(items.slice(), API_URL + "/tags/" + this.tag + "/media/recent?" + params());
    }

    this.get = function(i) {
      return getMod(items, i);
    };

    this.getByID = function(id) {
      if (!(id in cache)) {
        var url = API_URL + "/media/" + id + "?" + params();
        cache[id] = $.ajax({url: url, dataType: "jsonp"});
      }
      return cache[id];
    };

    this.getByURL = function(url) {
      var id;
      var regexes = [/^https?:\/\/instagram\.com\/p\/(.*)\/$/,
                     /^https?:\/\/instagr\.am\/p\/(.*)\/$/];
      for (var i = regexes.length; i--; ) {
        var matches = url.match(regexes[i]);
        if (matches && matches.length == 2) id = matches[1];
      }
      if (!id) throw "badURL";

      if (!cache[id]) {
        cache[id] = $.Deferred();
        var params = $.param({callback: "?", url: url});
        var getURL = "https://api.instagram.com/oembed?" + params;

        $.ajax({url: getURL, dataType: "jsonp"})
          .done(function(d) {
            this.getByID(d.media_id)
              .done(function(d) {
                cache[id].resolveWith(this, [d]);
              }.bind(this))
          }.bind(this));
      }
      return cache[id];
    };

    this.take = function(n, index) {
      var taken = [], start = index || 0;
      for(var i = start; i < start + n; i++) {
        taken.push(this.get(i));
      }
      return taken;
    };

    this.userUrl = function(user) {
      return ["http://instagram.com", user].join("/");
    };

    this.eaUrl = function(id) {
      return "#/posts/instagram/" + id;
    };

    /**
     * Extract the image data
     */
    this.toImage = function(d) {
      var img = d.images.low_resolution;
      return {
	id: d.id,
	url: img.url,
	width: img.width,
	height: img.height
      }
    };

    return this.fetchNext(this.limit);
  }

  // The global Fetchers
  // Check for being on a tagged page
  var currentTag = TumblrUtils.currentTag(window.location.pathname);
  var instaFetch = new InstaFetch({tag: currentTag || "everydayafrica", limit: 30});
  var tumblrFetch = new TumblrFetch({source: "everydayafrica.tumblr.com",
                                     tag: currentTag});


  /************
   * Navigation
   */

  var NavBar = React.createClass({
    render: function() {
      var navData = [
        {
          href: "#/countries",
          largeSrc: EAConfig.images.africa,
          smallSrc: EAConfig.images.africaWhite,
          activeSrc: EAConfig.images.africaBlack,
          content: "COUNTRIES"
        }, {
          href: "#/photographers",
          largeSrc: EAConfig.images.photographer,
          smallSrc: EAConfig.images.photographerWhite,
          activeSrc: EAConfig.images.photographerBlack,
          content: "PHOTOGRAPHERS"
        }, {
          href: "#/search",
          largeSrc: EAConfig.images.search,
          smallSrc: EAConfig.images.searchWhite,
          activeSrc: EAConfig.images.searchBlack,
          content: "SEARCH"
        }, {
          href: "#/about",
          largeSrc: EAConfig.images.about,
          smallSrc: EAConfig.images.aboutWhite,
          activeSrc: EAConfig.images.aboutBlack,
          content: "ABOUT"
        }
      ];

      var buttonsStyle = {display: Settings.isSmall() ? 'none' : 'inline-block'};

      return (
         <nav>
          <div id="nav-hamburger" className="nav-panel">
             <a href="#" onClick={this.menuHandler}>
               <img src={EAConfig.images.menu} />
             </a>
          </div>
          <div id="nav-buttons" className="nav-panel" style={buttonsStyle} >
            <ul>
              {_.map(navData, function(d) {
                var active = window.location.href.indexOf(d.href) !== -1;
                var href =  active ? "#/" : d.href;
                return (<li key={d.href}>
                          <NavToggleButton href={href}
			                   active={active}
                                           largeSrc={d.largeSrc}
                                           activeSrc={d.activeSrc}
                                           smallSrc={d.smallSrc}
                                           content={d.content}
                                           clickHandler={this.smallDismisser("#nav-buttons")} />
                        </li>);
              }, this)}
            </ul>
          </div>
          <div className="everydayafrica">
           <h1><a href="/"><span className="everyday">Everyday</span>Africa</a></h1>
          </div>
	   <div id="share-button">
	     <a href="#" onClick={this.shareHandler}>
	       <img src={EAConfig.images.share} />
	     </a>
	   </div>
           <div id="share-buttons" className="nav-panel" style={buttonsStyle}>
            <ul>
              <li>
                <NavToggleButton href={"http://instagram.com/everydayafrica"}
	                         target="_blank"
                                 largeSrc={EAConfig.images.from("instagram.svg")}
                                 smallSrc={EAConfig.images.from("instagram.svg")}
                                 activeSrc={EAConfig.images.from("instagram-black.svg")}
                                 clickHandler={this.smallDismisser("#share-buttons")} />
              </li>
              <li>
                <NavToggleButton href={"https://twitter.com/EverydayAfrica"}
	                         target="_blank"
                                 largeSrc={EAConfig.images.from("twitter.svg")}
                                 smallSrc={EAConfig.images.from("twitter.svg")}
                                 activeSrc={EAConfig.images.from("twitter-black.svg")}
                                 clickHandler={this.smallDismisser("#share-buttons")} />
              </li>
              <li>
                <NavToggleButton href={"https://www.facebook.com/everydayafrica"}
	                         target="_blank"
                                 largeSrc={EAConfig.images.from("facebook.svg")}
                                 smallSrc={EAConfig.images.from("facebook.svg")}
                                 activeSrc={EAConfig.images.from("facebook-black.svg")}
                                 clickHandler={this.smallDismisser("#share-buttons")} />
              </li>
              <li>
                <NavToggleButton href={window.location.hash.indexOf("#/tumblr/share") === - 1 ? "#/tumblr/share" : "#/"}
                                 largeSrc={EAConfig.images.from("tumblr.svg")}
                                 smallSrc={EAConfig.images.from("tumblr.svg")}
                                 activeSrc={EAConfig.images.from("tumblr-black.svg")}
                                 clickHandler={this.smallDismisser("#share-buttons")} />
              </li>
            </ul>
           </div>
         </nav>);
    },

    menuHandler: function(e) {
      e.preventDefault();
      $("#nav-buttons").fadeToggle();
    },

    smallDismisser: function(sel) {
      return function() {
	if (Settings.isSmall()) $(sel).toggle();
      }
    },

    shareHandler: function(e) {
      e.preventDefault();
      $("#share-buttons").fadeToggle();
    }
  });

  var NavToggleButton = React.createClass({
    getInitialState: function() {
      return {mouseOver: false};
    },

    render: function() {
      // The weird <div><img class="active-img ..." ...</div> nesting is to
      // get around a safari bug where the image became smaller on src change
      var activeClassSet = React.addons.classSet({
        "active-img": true,
        "large-img": true,
        "hide-for-small": true,
        "hide": !(this.props.active || this.state.mouseOver)});
      var largeClassSet = React.addons.classSet({
        "large-img": true,
        "hide-for-small": true,
        "hide": this.props.active || this.state.mouseOver});

      return (<a className="nav-button" href={this.props.href}
	         target={this.props.target}
	         onClick={this.props.clickHandler}>
                 <img className={activeClassSet}
                      src={this.props.activeSrc}
                      onMouseEnter={this.mouseEnterHandler}
                      onMouseLeave={this.mouseLeaveHandler} />
                 <img className={largeClassSet}
                      src={this.props.largeSrc}
                      onMouseEnter={this.mouseEnterHandler}
                      onMouseLeave={this.mouseLeaveHandler} />
                <img className="hide-for-large" src={this.props.smallSrc} />
                <span className="navlist">{this.props.content}</span>
              </a>);
    },

    mouseEnterHandler: function(e) {
      this.setState({mouseOver: true});
    },

    mouseLeaveHandler: function(e) {
      this.setState({mouseOver: false});
    }
  });

  /**
   * NavDrawers
   */
  var SlideToggleMixin = {
    componentDidMount: function() {
      // Slide in the drawer
      var $node = $(this.getDOMNode());
      $node.toggle();
      $node.slideToggle();
    },

    statics: {
      dismiss: function() {
        var node = this.getDOMNode();
        $(node).slideToggle({complete: function() {
	  React.unmountComponentAtNode(node);
        }.bind(this)})
      }
    }
  };

  var Countries = React.createClass({
    mixins: [SlideToggleMixin],

    render: function() {
      return (<div className="countries grid">
                <CloseWindow />
                <h3>Countries</h3>
                {_.map(this.props.data, function(data, country) {
                  return (<div key={country} className="country grid-item">
                            <a href={TumblrUtils.externalTagURL(country)}>
                              <img src={data.flag} alt={data.name} />
                              <h4>{data.name}</h4>
                            </a>
                          </div>);
                }.bind(this))}
              </div>);
    }
  });

  var Photographers = React.createClass({
    mixins: [SlideToggleMixin],

    render: function() {
      return (<div className="photographers grid">
                <CloseWindow />
                <h3>Photographers</h3>
                {_(this.props.data)
		   .sortBy(function(p) { return p.name.split(" ").slice(-1); })
		   .map(function(p) {
                     var image = p.image || EAConfig.images.photographer;
                     return (<div key={p.name} className="photographer grid-item">
                             <a href={TumblrUtils.externalTagURL(p.username)}>
                             <img className="protogimg" src={image} alt={p.name} />
                             <h4>{p.name}</h4>
                             </a>
                             </div>);
                   }.bind(this))}
              </div>);
    }
  });

  var Search = React.createClass({
    mixins: [SlideToggleMixin],

    render: function() {
      return (<div className="search">
                <CloseWindow />
                <h3>Search</h3>
                <input className="search-input"
                       placeholder="search term"
                       onKeyPress={this.keyPressHandler} />
              </div>);
    },

    keyPressHandler: function(e) {
      if (e.key === "Enter") {
        var input = $(this.getDOMNode()).find("input").val();
        if (input) location.href = TumblrUtils.externalTagURL(input);
      }
    }
  });

  var About = React.createClass({
    mixins: [SlideToggleMixin],

    // Each page is a different about page
    pages: [
      {name: "info",
       component: React.createClass({
         render: function() {
           return (<div className="about-info">
		   <p>
		   Everyday Africa, a collection of images shot on mobile phones across the continent, is an attempt to re-direct focus toward a more accurate understanding of what the majority of Africans experience on a day-to-day basis: normal life. Conceived by Peter DiCampo and Austin Merrill, and featuring numerous contributing photographers, the project is a response to the common media portrayal of the African continent as a place consumed by war, poverty, and disease. As journalists who are native to Africa or have lived and worked on the continent for years at a time, we find the extreme not nearly as prevalent as the familiar, the everyday.
		   </p>
		   <p>
		   Our home page: The images in the middle column were taken by official Everyday Africa photographers and include perspectives from Africans and non-Africans alike. To the left and right of the middle column are images taken by our thousands of followers, who have hash-tagged their photos #everydayafrica—the view points and information contained in those images are theirs alone.
		   </p>
		   <h4>Contact:</h4>
		   <ul>
		     <li>
		       <a href="mailto:everydayafrica@gmail.com">everydayafrica@gmail.com</a>
		     </li>
		     <li>
		       <a href="mailto:peter@peterdicampo.com">Peter DiCampo</a>
		     </li>
		     <li>
		       <a href="mailto:austinmerrill@gmail.com">Austin Merrill</a>
		     </li>
		   </ul>
		   <p>
		   This website was made possible thanks to the generous support of the Pulitzer Center on Crisis Reporting and the Open Society Foundations.
		   [include Pulitzer and OSF logos]
		   </p>
		   <p>
		   Everyday Africa is also honored to acknowledge its collaborative partnerships with Uncharted Digital, The LAMP, and the Bronx Documentary Center. [include logos]
		   </p>
		   <p>
		   This site was designed by <a target="_blank" href="http://uncharteddigital.com/">Uncharted Digital</a>.
		   </p>
                   </div>);
         }
       })},

      {name: "photographers",
       component: React.createClass({
         render: function() {
           return (<div className="about-photographers">
                     <ul>
                       {_.map(EAConfig.photographers, function(p) {
                         return <li key={p.name}><a href={p.url}>{p.name}</a> @{p.username}</li>;
                       })}
                     </ul>
                   </div>);
         }
      })},

      {name: "publications",
       component: React.createClass({
         render: function() {
           var img = function(file) {
             return (<img className="tearsheet"
                          src={EAConfig.tearsheetBase + "/resized/" + file} />);
           };
           return (<div className="about-tearsheets">
                     <h4>Written work / Interviews</h4>
                     <ul>
                       {_.map(EAConfig.writtenWork, function(w) {
                         return (<li key={w.body}>
                                   {w.body}
                                   <a href={w.url}>{w.url}</a>
                                 </li>);
                        })}
                     </ul>
                     <h4>Tearsheets</h4>
                     <ol>
                       <li>
                         {img("001.jpg")}
                         <p>Aperture Magazine, Spring 2014 "Documentary, Expanded" Issue</p>

                        <p>Accompanying article "Toward a New Documentary Expression" by Stephen Mayes</p>
                         <p><a href="http://www.aperture.org/blog/toward-new-documentary-expression/">http://www.aperture.org/blog/toward-new-documentary-expression/</a></p>

                        <p>Photos by Charlie Shoemaker, Peter DiCampo, Glenna Gordon Photography, and Nana Kofi Acquah (Clockwise from top left)</p>
                       </li>
		       <li>
                         {img("002.jpg")}
                         <p>National Geographic, October 2013, “The Photography Issue”</p>
                         <p><a href="http://ngm.nationalgeographic.com/2013/10/digital-village/everyday-africa-photography">http://ngm.nationalgeographic.com/2013/10/digital-village/everyday-africa-photography</a></p>
		       </li>
                       <li>
                         {img("003.jpg")}
                         <p>Departures, October 2013</p>
                       </li>
		       <li>
                         {img("004.jpg")}
                         <p>The New York Times - Lens blog, September 2013</p>
                         <p><a href="http://lens.blogs.nytimes.com/2013/09/16/everyday-nigeria-not-idealized-not-debased">http://lens.blogs.nytimes.com/2013/09/16/everyday-nigeria-not-idealized-not-debased</a></p>
                       </li>
		       <li>
                         {img("005a.jpg")}
                         {img("005b.jpg")}
                         {img("005c.jpg")}
                         <p>Newsweek Japan, March 2013 (3 total)</p>
                       </li>
                       <li>
                         {img("006.jpg")}
                         <p>China City Zine Magazine, March 2013</p>
		       </li>
                       <li>
                         {img("007.jpg")}
                         <p>Interview with co-founder Austin Merrill on Around the World With Christiane Amanpour for ABC / Yahoo! News. April 2013.</p>
                         <p><a href="http://news.yahoo.com/blogs/around-the-world-abc-news/surprising-images-life-africa-040640315.html#more-id">http://news.yahoo.com/blogs/around-the-world-abc-news/surprising-images-life-africa-040640315.html#more-id</a></p>
                       </li>
                       <li>
                         {img("008.jpg")}
                         <p>The Sunday Times (Johannesburg), March 2013</p>
                       </li>
		       <li>
                         {img("009.jpg")}
                         <p>The New Yorker - Photo Booth, February 2013</p>
                         <p><a href="http://www.newyorker.com/online/blogs/photobooth/2013/02/slide-show-across-the-continent-with-everyday-africa.html#slide_ss_0=1">http://www.newyorker.com/online/blogs/photobooth/2013/02/slide-show-across-the-continent-with-everyday-africa.html#slide_ss_0=1</a></p>
		       </li>
                       <li>
                         {img("010.jpg")}
                         <p>The New Yorker - Instagram takeover, February 2013</p>
                         <p><a href="http://www.newyorker.com/online/blogs/photobooth/2013/02/slide-show-across-the-continent-with-everyday-africa.html#slide_ss_0=1">http://www.newyorker.com/online/blogs/photobooth/2013/02/slide-show-across-the-continent-with-everyday-africa.html#slide_ss_0=1</a></p>
		       </li>
                       <li>
                         {img("011.jpg")}
                         <p>Article by co-founder Peter DiCampo in Salon, February 2013</p>
                         <p>http://www.salon.com/2013/02/04/introducing_africa_to_the_omg_crowd/</p>
                       </li>
                       <li>
                         {img("012a.jpg")}
                         {img("012b.jpg")}
                         {img("012c.jpg")}
                         <p>Internazionale, January 2013 (3 total)</p>
                       </li>
                       <li>
                         {img("013.jpg")}
                         <p>The New York Times - Lens Blog, September 2012</p>
                         <p>http://lens.blogs.nytimes.com/2012/09/17/picturing-everyday-life-in-africa/</p>
                       </li>
                       <li>
                         {img("014.jpg")}
                         <p>Bloomberg Businessweek, August 2012</p>
                       </li>
                     </ol>
                   </div>);
           }
       })},
      {name: "curriculum",
       component: React.createClass({
         render: function() {
           return (<p>Curriculum HTML Goes Here</p>);
         }
       })}
    ],

    attrs: {
      className: "about"
    },

    currentPage: function() {
      return _.find(this.pages, function(d) {
	return d.name === this.props.type;
      }, this);
    },

    render: function() {
      // Create the about page(s) based on screen size
      if (Settings.isSmall()) {
        return (<div className="about">
                  <CloseWindow />
                  <h3>About</h3>
                  <div className="about-page">
                    {_.map(this.pages, function(page, i) {
                        var component = page.component;
                        return <component key={page.name} className="about" />;
                      }, this)}
                  </div>
                </div>);
      } else {
        var page = this.currentPage().component;
        var currentType = this.props.type;
        var classes = function(type) {
          return React.addons.classSet({active: type === currentType,
                                        inactive: type !== currentType});
        }

        if (page) {
          return (<div className="about">
                    <CloseWindow />
                    <div className="about-nav">
                      <ul className="nav-list">
                        {_(this.pages).pluck("name").map(function(p) {
                          return <li className={classes(p)}><a href={"#/about/" + p}>{p}</a></li>
                         })}
                      </ul>
                    </div>
                    <div className="about-page">
                      <page className="about" />
                    </div>
                  </div>);
        }
      }
    }
  });

  var TumblrShare = React.createClass({
    mixins: [SlideToggleMixin],

    render: function() {
      return (<div className="tumblr-share">
                <a target="_blank" href={"http://instagram.com/" + EAConfig.account}>
                  <img src={EAConfig.profilePic} />
                </a>
                <div className="follow">
                  <a target="_blank" href={EAConfig.follow}>+ Follow {EAConfig.account}</a>
                </div>
                <a href="http://tumblr.com">
                  <img src={EAConfig.images.tumblrLogotype64} />
                </a>
              </div>);
    }
  });


  /********
   * Images
   */

  // The gallery of ALL images
  var Gallery = React.createClass({
    render: function() {
      // Divide the images which fall on the left and the right
      var width = $(window).width();

      if (width > Settings.galleryBreakpoint) {
        var singleRatio = 0.12
        var sideLength = singleRatio * width;
        var centerLength = (1 - (singleRatio * 6)) * width;

        
        var total = this.props.tumblr ? this.props.tumblr.length * (centerLength / sideLength * 6) : 0;
        var imageGroups = partition(instaFetch.take(total).map(function(d, i) {
          return {key: i, deferred: d};
        }), 3);
        return (<div className="gallery desktop">
                  <GalleryColumn type="instagram" position="left" imageLength={sideLength} data={imageGroups[0]} />
		  <div className="gallery-column center-column">
                    {_.map(this.props.tumblr, function(d, i) {
                      var classes = React.addons.classSet({
                        'tagged-image': true, image: true});
                      return (<TaggedImage key={i}
                                           className={classes}
                                           imageLength={centerLength}
                                           type="tumblr"
                                           image={TumblrUtils.toImage(d)} />);
                        }, this)}
		  </div>
                  <GalleryColumn type="instagram" position="right" imageLength={sideLength} data={imageGroups[1]} />
              </div>);

        } else {
          var single = width / 3;
          var dbl = single * 2;

          var instaGen = (function(instaFetch) {
            var index = 0;
            return function() {
              var deferred = instaFetch.get(++index);
              return <TaggedImage className="mobile image instagram"
                                  key={index}
                                  imageLength={single}
                                  type="instagram"
                                  deferred={deferred} />;
            };
          })(instaFetch);

          return (<div className="gallery mobile">
                    {_.map(this.props.tumblr, function(p, i) {
                      var even = i % 2 === 0;
                      return (<div>
                                <div className="mobile-row dbl-row">
                                  {!even &&
                                   <div className="single-col left">
                                     {instaGen()}
                                     {instaGen()}
                                   </div>}
                                  <TaggedImage className="mobile image tumblr"
                                               key={i}
                                               imageLength={dbl}
                                               type="tumblr"
                                               image={TumblrUtils.toImage(p)} />
                                  {even &&
                                   <div className="single-col right">
                                     {instaGen()}
                                     {instaGen()}
                                   </div>}
                                </div>
                                <div className="clear" />
                                <div className="mobile-row single-row">
                                  {instaGen()}
                                  {instaGen()}
                                  {instaGen()}
                                </div>
                              </div>);
                    }.bind(this))}
                  </div>);
        }
    }
  });

  // A column of images
  var GalleryColumn = React.createClass({

    getDefaultProps: function() {
      return {data: []};
    },

    render: function() {
      var classes = React.addons.classSet({
        'gallery-column': true,
        'left-column': this.props.position === "left",
        'right-column': this.props.position === "right",
        'center-column': this.props.position === "center"
      });

      return (<div className={classes}>
                {_(this.props.data).map(function(d) {
                  var classes = React.addons.classSet({
                    'tagged-image': true, image: true});

                  return (<TaggedImage key={d.key}
                                       className={classes}
                                       imageLength={this.props.imageLength}
                                       type={this.props.type}
                                       deferred={d.deferred} />);
                }.bind(this))}
              </div>);
    }
  });

  // A single Image
  var TaggedImage = React.createClass({
    getDefaultProps: function() {
      return {scale: 1.2, duration: 200};
    },

    componentWillMount: function() {
      // If provided a deferred, set the image when done
      if (this.props.deferred) {
	this.props.deferred.done(function(d) {
          this.setState({image: InstaUtils.toImage(d),
                         user: d.user});
	}.bind(this));
      } else if (this.props.image){
	this.setState({image: this.props.image});
      }
    },

    render: function() {
      var divStyle = {
        width: this.props.imageLength,
        height: this.props.imageLength,
        opacity: 0};
      var aStyle = _.pick(divStyle, ['width', 'height']);

      // If the image has been set
      var imgStyle = {};
      var url = "#";
      if (this.state && this.state.image) {
	url = this.state.image.url;
        if (this.state.image.width > this.state.image.height) {
          // imgStyle.width = "120%";
          imgStyle.width = "101%";
        } else {
          // imgStyle.height = "120%";
          imgStyle.height = "101%";
        }
      }

      return (<div ref={this.props.key} className={this.props.className} style={divStyle}>
                 <a href={"#/posts/" + this.props.type + "/" + this.props.key + "/instagram"}
                    style={aStyle}
                    onMouseEnter={this.mouseEnterHandler}
                    onMouseOut={this.mouseOutHandler}
	          >
                   <img src={url} style={imgStyle} />
	           {this.props.type === "tumblr" && <div className="img-overlay">
                      <img src={EAConfig.profilePic} />
                      <span>{EAConfig.account}</span>
	            </div>}
                   {this.props.type === "instagram" && this.state && this.state.user && <div className="img-overlay">
                      <img src={this.state.user.profile_picture} />
                    </div>}
                 </a>
              </div>);
    },

    componentDidMount: function() {
      // Fade in the image
      var $node = $(this.getDOMNode());
      // $node.find(".img-overlay").css("opacity", 0);
      $node.find("img").load(function(d) {
        $node.css("opacity", 1);
      });
    },

    mouseEnterHandler: function() {
      $(this.getDOMNode()).find(".img-overlay").css("opacity", 1);
    },

    mouseOutHandler: function() {
      $(this.getDOMNode()).find(".img-overlay").css("opacity", 0);
    }
  });

  var CloseWindow = React.createClass({
    render: function() {
      return <div className="close-window"><a href="#"><h3>x</h3></a></div>;
    }
  });

  var CloseWindowOverlay = React.createClass({
    render: function() {
      return <div className="close-window-overlay"><a href="#/"><h3>x</h3></a></div>;
    }
  });

  var FadeToggleMixin = {
    componentDidMount: function() {
      // Slide in the drawer
      var $node = $(this.getDOMNode());
      $node.toggle();
      $node.fadeToggle();
    },

    dismiss: function() {
      var node = this.getDOMNode();
      $(node).fadeToggle({complete: function() {
	React.unmountComponentAtNode(node);
      }.bind(this)})
    }
  }

  // The Image detail view
  var ImageDetails = React.createClass({
    // mixins: [FadeToggleMixin],

    getSources: function() {
      return _.pick(this.props, ["tumblr", "instagram"]);
    },

    componentWillMount: function() {
      var active;
      if (this.props.active) {
        active = this.props.active;
      } else {
        if (this.props.tumblr) {
          active = "tumblr";
        } else if (this.props.instagram) {
          active = "instagram";
        }
      }
      this.setState({active: active});

    },

    componentDidMount: function() {
      // Get the image if it is not cached
      if (this.props.instagramURL && !this.props.instagram) {
        instaFetch.getByURL(this.props.instagramURL)
	  .done(function(d) {
            this.setProps({instagram: d.data});
          }.bind(this));
      }

      // Wire up next/prev keydown listeners
      $(window).keydown(function(e) {
        if ( e.keyCode === 37 ) {
          e.preventDefault();
          window.location.hash = this.props.prev;
        } else if ( e.keyCode === 39 ) {
          e.preventDefault();
          window.location.hash = this.props.next;
        } else if (e.keyCode === 27) {
          e.preventDefault();
          window.location.hash = "#";
        }
      }.bind(this));

      // Swipe listeners
      $(this.getDOMNode()).swipe({
        swipeLeft: function() {
          window.location.hash = this.props.next;
        }.bind(this),
        swipeRight: function() {
          window.location.hash = this.props.prev;
        }.bind(this)
      });

      var $imageDetail = $(this.refs.imageDetail.getDOMNode());
      var $moreIndicator = $(this.refs.moreIndicator.getDOMNode());
      if ($imageDetail.scrollable()) {
        $imageDetail.scroll(function(e) {
          $moreIndicator.css("opacity", 0);
        }.bind(this));
      } else {
        $moreIndicator.css("display", "none");
      }
    },

    componentWillUnmount: function() {
      // Remove next/prev keydown listeners
      $(window).unbind('keydown');
      $(this.getDOMNode()).swipe("destroy");
    },

    instaUserURL: function()  {
      return instaFetch.userUrl(this.props.user.username);
    },

    topRightButton: function() {
      if (this.props.tumblr) {
        return <a href={"http://www.tumblr.com/reblog/" + this.props.tumblr.id + "/" + this.props.tumblr.reblog_key} className="follow-link">Reblog</a>;
      } else {
        return <a href={this.instaUserURL()} target="_blank" className="follow-link">Follow</a>
      }
    },

    render: function() {
      var count = _.values(this.getSources()).length;
      var instaUserURL = this.instaUserURL();

      return (<div className="detail" onKeyPress={this.keyPressHandler}>
                <CloseWindowOverlay />
                <div className="overlay">
                  <a href="#/"></a>
                </div>
                <div className="detail-nav">
                  <a className="arrow-left" href={this.props.prev}>
                    <img src={EAConfig.images.arrowleft} />
                  </a>
                  <a className="arrow-right" href={this.props.next}>
                    <img src={EAConfig.images.arrowright} />
                  </a>
                </div>
                <div ref="imageDetail" className="image-detail">
	          <a target="_blank" href={this.props.instagramURL}>
                    <img src={this.props.image.url} className="image-large"/>
	          </a>
                  <div className="detail-panel">
                    <div className="detail-header">
	              <a target="_blank" href={instaUserURL}>
                        <img src={this.props.user.profile_picture} />
	              </a>
                      <div>
                        <a target="_blank" href={instaUserURL}>
                          <h4>{this.props.user.username}</h4>
                        </a>
                        <h5>{this.props.created.fromNow()}</h5>
                      </div>
                      {this.topRightButton()}
                    </div>
                    <div className="caption"
                         dangerouslySetInnerHTML={{__html: this.props.caption}} />
                    <div>
                      <ul className="sources">
                        {_(this.getSources())
                           .keys().sort()
                           .map(function(type) {
                             var style = {width: (100 / count) + "%"}
                             var classes = React.addons.classSet(
                               {active: type === this.props.active,
                                "not-active": type !== this.props.active});
                               return <li key={type} className={classes} style={style}>
                                        <a href={this.props.url + "/" + type}>{type}</a>
                                      </li>;

                             }.bind(this))}
                      </ul>
                    </div>
                    {this.props.active === "tumblr" && this.props.tumblr &&
                      <TumblrDetails tags={TumblrUtils.toTags(this.props.tumblr)}
                                     notes={this.props.tumblr.note_count} />}
                    {this.props.active === "instagram" && this.props.instagram &&
                      <InstagramDetails tags={this.props.instagram.tags}
                                        likes={this.props.instagram.likes}
                                        comments={this.props.instagram.comments} />}
                  </div>
	          <img ref="moreIndicator"
                       className="more-indicator"
                       src={EAConfig.images.arrowdown} />
                </div>
              </div>);
    }
  });

  var InstagramDetails = React.createClass({
    render: function() {
      var additionalLikes = this.props.likes.count - this.props.likes.data.length;
      return(<div className="instagram source-details">
               <TagList tags={_.map(this.props.tags, function(t) {
                 return {tag: t, url: "/tagged/" + t};
               })} />
               <div className="detail-hearts detail-list">
                 <div className="leftcol">
                   <img src={EAConfig.images.heart} className="icon"/>
                 </div>
                 <div className="rightcol">
                   <ul className="detail-hearts">
                     {this.props.likes.data.map(function(d, i) {
                        return <li key={i}>
                                 <a target="_blank" href={instaFetch.userUrl(d.username)}>
                                   {d.username}
                                 </a>,&emsp;
                               </li>; })}
	             {(additionalLikes > 0) && <li>and {additionalLikes} others like this</li>}
                   </ul>
                 </div>
               </div>
               <CommentBox comments={{instagram: this.props.comments}}/>
             </div>);
    }
  });

  var TumblrDetails = React.createClass({
    render: function() {
      return (<div className="tumblr source-details">
                <TagList tags={_.map(this.props.tags, function(t) {
                  return {tag: t.tag, url: t.tagUrl};
                })} />
                <div className="reblogs" dangerouslySetInnerHTML={{__html: this.props.reblogButton}} />
                <p>{this.props.notes ? this.props.notes : 0} Photo Reblogs</p>
              </div>);
    }
  });

  /**
   * TagList draws a list of tags for the detail views
   *
   * props: {tags: [{tag: string, url: string}]}
   */
  var TagList = React.createClass({
    render: function() {
        return (<div className="detail-tags detail-list">
                 <div className="leftcol">
                   <img src={EAConfig.images.tag} className="icon"/>
                 </div>
                 <div className="rightcol">
                   <ul>
                     {_(this.props.tags).map(function(t) {
                       return <li><a href={t.url}>{t.tag}</a></li>; })}
                   </ul>
                 </div>
               </div>);
    }
  });

  /*
   * Properties:
   *
   * props: {
   *   comments: {
   *     instagram: see above,
   *     tumblr: see above
   *   },
   *   active: "tumblr" | "instagram"
   * }
   *
   * The comment type selector will only contain the types for which
   * there are comments.
   */
  var CommentBox = React.createClass({
    getDefaultProps: function() {
      // Set the active comment type
      return {active: _.findKey(this.props.comments)};
    },

    // Get the currently active comments
    activeComments: function() {
      return this.props.comments[this.props.active].data;
    },

    render: function() {
      return (<div className="comments">
                <div>
                  {_.map(this.activeComments(), function(comment) {
                    return <Comment key={comment.id} data={comment} />;
                  }.bind(this))}
                  <div>
                  </div>
                </div>
              </div>);
    }
  })

  /*
   * Single Comment View
   */
  var Comment = React.createClass({
    render: function() {
      return (<div className="comment">
          <div className="leftcol">
            <img src={this.props.data.from.profile_picture} className="circle_profile" />
          </div>
            <div className="rightcol">
              <h4>{this.props.data.from.username}</h4>
              <p className="comment-post">{this.props.data.text}</p>
            </div>
              </div>);
    }
  });

  /**
   * Mount components, and wire up responsive layout
   */
  (function() {
    var gallery = <Gallery tag="everydayafrica" />;
    var navBar = <NavBar />;

    React.renderComponent(navBar, $("header").get(0));
    React.renderComponent(gallery, $("#content").get(0));

    /**
     * Fix/unfix body scrolling
     */
    var bodyScroll = {
      fix:   function() { $("body").addClass("modal-scroll"); },
      unfix: function() { $("body").removeClass("modal-scroll"); }
    };

    /**
     * Generate the toggleable modal
     */
    function ComponentHandler($root) {
      var rootElt = $root.get(0);
      var mounted;

      this.show = function(component) {
        this.dismiss();

        mounted = component;
        bodyScroll.fix();
        React.renderComponent(component, rootElt);
      };

      this.dismiss = function() {
        if (mounted) {
          if ("dismiss" in mounted) {
            mounted.dismiss();
          } else {
            React.unmountComponentAtNode(rootElt);
          }
        }
        bodyScroll.unfix();
        mounted = undefined;
      };

      // A helper for the routing
      this.dismissFn = function() {
        return function() {
          this.dismiss();
        }.bind(this);
      }

      this.forceUpdate = function() {
        if (mounted) mounted.forceUpdate();
      }
    }

    var Details = new ComponentHandler($("#modal"));
    var NavDrawer = new ComponentHandler($("#nav-drawer"));

    // Easy peasy responsive: Just update everything on resize
    $(window).resize(function() {
      gallery.forceUpdate();
      navBar.forceUpdate();
      NavDrawer.forceUpdate();
    });

    // Infinite scroll
    // Fetch the next set of tumblr images, update the gallery
    function tumblrNext() {
      instaFetch.fetchNext(8 * 10);
      var deferred = tumblrFetch.fetchNext();
      if (deferred) {
        deferred.done(function(resp) {
          // cache the instagram data
          _.each(resp.posts, function(post) { instaFetch.getByURL(post.link_url); });
          gallery.setProps({tumblr: tumblrFetch.items.slice()});
        });
      }
    }
    tumblrNext();

    $(window).scroll(function() {
      var scrollBot = $(".gallery").height() - $(window).height() - $(window).scrollTop();
      if (scrollBot < 100) tumblrNext();
    });

    /*********
     * Routing
     */

    var router = Router({
      "/": function() {
        Details.dismiss();
        NavDrawer.dismiss();
      },

      "/countries": {
        on: function() {
          NavDrawer.show(<Countries data={EAConfig.countries} />);
        },
        after: NavDrawer.dismissFn
      },

      "/photographers": {
        on: function() {
          NavDrawer.show(<Photographers data={EAConfig.photographers} />);
        },
        after: NavDrawer.dissmissFn
      },

      "/search": {
        on: function() {
          NavDrawer.show(<Search />);
        },
        after: NavDrawer.dissmissFn
      },

      "/about": {
        "/:page": {
          on: function(type) {
            NavDrawer.show(<About type={type} />);
          },
          after: NavDrawer.dissmissFn
        },
        on: function() {
          NavDrawer.show(<About type="info" />);
        },
        after: NavDrawer.dissmissFn
      },

      "/tumblr/share": {
        on: function() {
          NavDrawer.show(<TumblrShare />);
        },
        after: NavDrawer.dissmissFn
      },

      "/posts/tumblr/:id/?(\\w+)?": function(rawId, type) {
        var id = parseInt(rawId);
	var post = tumblrFetch.get(id);
        if(post) {
          Details.show(
              <ImageDetails id={id}
                            url={"#/posts/tumblr/" + id}
                            caption={post.caption}
                            created={moment(post.date)}
                            image={TumblrUtils.toImage(post)}
                            // Warning: pic is hardcoded
                            user={{profile_picture: EAConfig.profilePic,
                                   username: tumblrFetch.blog.name}}
                            tumblr={post}
                            active={type || "instagram"}
                            instagramURL={post.link_url}
	                    next={TumblrUtils.internalPostURL((id + 1).mod(tumblrFetch.items.length))}
		            prev={TumblrUtils.internalPostURL((id - 1).mod(tumblrFetch.items.length))}
	                   />);
        }
      },

      "/posts/instagram/:id/?(\\w+)?": function(rawId, type) {
        var id = parseInt(rawId);
        instaFetch.get(id).done(function(post) {
          if(post) {
	    // console.log(post);
            Details.show(
                <ImageDetails id={id}
                              url={instaFetch.eaUrl(id)}
                              caption={post.caption ? post.caption.text : undefined}
                              image={post.images.standard_resolution}
                              created={moment.unix(post.created_time)}
                              user={post.user} // TODO -- needs correct user data
                              active={type || "instagram"}
                              instagram={post}
	                      instagramURL={post.link}
	                      next={instaFetch.eaUrl((id + 1).mod(instaFetch.limit))}
	                      prev={instaFetch.eaUrl((id - 1).mod(instaFetch.limit))}
		            />);
          }
        });
      }
    });

    router.configure({
      on: function() { navBar.forceUpdate(); }
    }).init();
  })();


}(jQuery, _, React, Router));
