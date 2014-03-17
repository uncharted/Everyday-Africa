/** @jsx React.DOM */
"use strict";

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
   *
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

    externalTagURL: function(tag) {
      return TumblrVars.blogUrl + "/tagged/" + tag;
    },

    internalPostURL: function(id) {
      return "#/posts/tumblr/" + id + "/instagram";
    },

    fetchAvatar: function(args) {
      var apiURL = "https://api.tumblr.com/v2";
      var params = $.param({callback: "?"});
      var url = apiURL + "/blog/" + args.source + "/avatar/" + args.size || 128;
      return $.ajax({url: url + "?" + params, dataType: "jsonp"});
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
      console.log(d);
      var posts = d.response.posts;
      for (var i = 0; i < posts.length; i++) {
        this.items.push(posts[i]);
      }

      // Set the total number of posts
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
          .done(onFetchDone.bind(this))
          .then(function() {
            offset += limit;
            fetchLock.release();
          });
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
              // If there are no more deferreds, terminate
              return false;
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

    /*
     * External API
     */
    this.populate = function(limit) {
      // Set all of the deferreds
      items = _.times(limit || 20, function() {
        return $.Deferred().done(function (d) {
          // Add to the cache when done
          cache[d.id] = d;
        });
      });

      this.get = function(i) {
        return getMod(items, i);
      }

      this.getByID = function(id) {
        if (!(id in cache)) {
          var url = API_URL + "/media/" + id + "?" + params();
          cache[id] = $.ajax({url: url, dataType: "jsonp"});
        }
        return cache[id];
      }

      this.take = function(n, index) {
        var taken = [], start = index || 0;
        for(var i = start; i < start + n; i++) {
          taken.push(this.get(i));
        }
        return taken;
      }

      return fetch(items.slice(), API_URL + "/tags/" + this.tag + "/media/recent?" + params());
    }

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
    }

    return this.populate(this.limit);
  }

  // The global Fetchers
  var instaFetch = new InstaFetch({tag: "everydayafrica", limit: 30});
  var tumblrFetch = new TumblrFetch({source: "everydayafrica.tumblr.com"});


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
          content: "COUNTRIES"
        }, {
          href: "#/photographers",
          largeSrc: EAConfig.images.photographer,
          smallSrc: EAConfig.images.photographerWhite,
          content: "PHOTOGRAPHERS"
        }, {
          href: "#/search",
          largeSrc: EAConfig.images.search,
          smallSrc: EAConfig.images.searchWhite,
          content: "SEARCH"
        }, {
          href: "#/about",
          largeSrc: EAConfig.images.about,
          smallSrc: EAConfig.images.aboutWhite,
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
                var href = (window.location.href.indexOf(d.href) == -1) ? d.href : "#/";
                return (<li>
                          <NavToggleButton href={href}
                                           largeSrc={d.largeSrc}
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
              <li><a target="_blank" href="http://instagram.com/everydayafrica"><img src={EAConfig.images.instagram} /></a></li>
              <li><a target="_blank" href="https://twitter.com/EverydayAfrica"><img src={EAConfig.images.twitter} /></a></li>
              <li><a target="_blank" href="https://www.facebook.com/everydayafrica"><img src={EAConfig.images.facebook} /></a></li>
              <li><a target="_blank" href="http://everydayafrica.tumblr.com/#me"><img src={EAConfig.images.tumblr} /></a></li>
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
    render: function() {
      return (<a className="nav-button" href={this.props.href}
	         onClick={this.props.clickHandler}>
                <img className="hide-for-small" src={this.props.largeSrc} />
                <img className="hide-for-large" src={this.props.smallSrc} />
                <span className="navlist">{this.props.content}</span>
              </a>);
    }
  });

  /**
   * NavDrawers:
   *   - Countries
   *   - Photographers
   *   - Search
   */
  var SlideToggleMixin = {
    componentDidMount: function() {
      // Slide in the drawer
      var $node = $(this.getDOMNode());
      $node.toggle();
      $node.slideToggle();
    },

    dismiss: function() {
      var node = this.getDOMNode();
      $(node).slideToggle({complete: function() {
	React.unmountComponentAtNode(node);
      }.bind(this)})
    }
  };

  var Countries = React.createClass({
    mixins: [SlideToggleMixin],

    render: function() {
      return (<div className="countries grid">
                <CloseWindow />
                <h3>Countries</h3>
                {_.map(this.props.data, function(data, country) {
                  return (<div className="country grid-item">
                            <a href={tumblrTagUrl(country)}>
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
                {_.map(this.props.data, function(p) {
                  return (<div className="photographer grid-item">
                            <a href={p.url}>
                              <img className="protogimg" src="http://placehold.it/50x50" alt={p.name} />
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
        if (input) location.href = tumblrTagUrl(input);
      }
    }
  });

  var About = React.createClass({
    mixins: [SlideToggleMixin],

    // Each page is a different about page
    pages: [
      {name: "default",
       component: React.createClass({
         render: function() {
           return (<div>
                   <img src="http://25.media.tumblr.com/f40df582632484f1bc2db7e3d00deaf1/tumblr_n0l3ujEqBi1rgx8vno1_500.jpg" />
                   <p>
                   Hey there! This is an about page. Let us know what
                   content you would like to see here.
                   </p>
                   </div>);
         }
       })},

      {name: "etc",
       component: React.createClass({
         render: function() {
           return <p>... and etc ...</p>;
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
                        return <component className="about" />;
                      }, this)}
                  </div>
                </div>);
      } else {
        var page = this.currentPage().component;
        if (page) {
          return (<div className="about">
                    <CloseWindow />
                    <div className="about-nav nav-list">
                      <h3>About</h3>
                      <ul>
                        <li><a href="#/about/default">Summary</a></li>
                        <li><a href="#/about/etc">Etc</a></li>
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

  /********
   * Images
   */

  // The gallery of ALL images
  var Gallery = React.createClass({
    render: function() {
      // Divide the images which fall on the left and the right
      var width = $(window).width();

      if (width > Settings.galleryBreakpoint) {
        var total = this.props.tumblr ? this.props.tumblr.length * 24 : 0;
        var imageGroups = partition(instaFetch.take(total).map(function(d, i) {
          return {key: i, deferred: d};
        }), 3);
        var sideLength = 0.1 * width;
        var centerLength = 0.4 * width;
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
          this.setState({image: InstaUtils.toImage(d)});
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
          imgStyle.width = "140%";
        } else {
          imgStyle.height = "140%";
        }
      }

      return (<div ref={this.props.key} className={this.props.className} style={divStyle}>
                 <a href={"#/posts/" + this.props.type + "/" + this.props.key + "/instagram"}
                    style={aStyle}
                    // onMouseEnter={this.mouseEnterHandler}
                    // onMouseOut={this.mouseOutHandler}
	          >
                   <img src={url} style={imgStyle} />
                 </a>
              </div>);
    },

    componentDidMount: function() {
      // Fade in the image
      var $node = $(this.getDOMNode());
      $node.find("img").load(function(d) {
        $node.css("opacity", 1);
      });
    },

    mouseEnterHandler: function() {
      var $div = $(this.getDOMNode());
      $div.find("a")
        .finish()
        .css("z-index", 2)
        .animate({width: $div.width() * this.props.scale,
                  height: $div.height() * this.props.scale,
                  "margin-left": "-=" + ($div.width() * this.props.scale) / 12,
                  "margin-top": "-=" + ($div.height() * this.props.scale) / 12},
                 this.props.duration);
    },

    mouseOutHandler: function() {
      var $div = $(this.getDOMNode());
      $div.find("a")
        .finish()
        .css("z-index", 1)
        .animate({width: $div.width(),
                  height: $div.height(),
                  "margin-left": "+=" + ($div.width() * this.props.scale) / 12,
                  "margin-top": "+=" + ($div.height() * this.props.scale) / 12},
                 this.props.duration,
                 function() {
                   $(this).css("z-index", 0);
                 });
    }
  });

  var CloseWindow = React.createClass({
    render: function() {
      return <div className="close-window"><a href="#">x</a></div>;
    }
  });

  var CloseWindowOverlay = React.createClass({
    render: function() {
      return <div className="close-window"><a href="#/">x</a></div>;
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
      if (this.props.instagramID) {
        instaFetch.getByID(this.props.instagramID).done(function(d) {
          this.setProps({instagram: d.data})
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
    },

    componentWillUnmount: function() {
      // Remove next/prev keydown listeners
      $(window).unbind('keydown');
    },

    render: function() {
      var count = _.values(this.getSources()).length;

      var captionText;
      if (this.props.caption) {
        captionText = this.props.caption.replace("<p>", "").replace("</p>", "")
      } else {
        captionText = "";
      }

      return (<div className="detail" onKeyPress={this.keyPressHandler}>
                <div className="overlay">
                  <CloseWindowOverlay />
                  <a href="#/"></a>
                </div>
                <div className="detail-nav">
                  <a className="arrow-left" href={this.props.next}>
                    <img src={EAConfig.images.arrowleft} />
                  </a>
                  <a className="arrow-right" href={this.props.prev}>
                    <img src={EAConfig.images.arrowright} />
                  </a>
                </div>
                <div className="image-detail">
                  <img src={this.props.image.url} className="image-large"/>
                  <div className="detail-panel">
                    <div className="detail-header">
                      <img  onKeyPress={this.keyPressHandler} src={this.props.user.profile_picture} />
                      <div>
                        <a href={instaFetch.userUrl(this.props.user.username)}>
                          <h4>{this.props.user.username}</h4>
                        </a>
                        <h5>{moment.unix(this.props.created).fromNow()}</h5>
                      </div>
                      <a href="http://www.tumblr.com/follow/everydayafrica"
                         className="follow-link">Follow</a>
                    </div>
                    <p className="caption">{captionText}</p>
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
                                     notes={this.props.tumblr.note_count}
                                     likeButton={this.props.tumblr.likeButton}
                                     reblogButton={this.props.tumblr.reblogButton} />}
                    {this.props.active === "instagram" && this.props.instagram &&
                      <InstagramDetails tags={this.props.instagram.tags}
                                        likes={this.props.instagram.likes}
                                        comments={this.props.instagram.comments} />}
                  </div>
                </div>
              </div>);
    },

    keyPressHandler: function(e) {
      console.log(e);
    }
  });

  var InstagramDetails = React.createClass({
    render: function() {
      return(<div className="instagram source-details">
               <TagList tags={_.map(this.props.tags, function(t) {
                 return {tag: t, url: "#"};
               })} />
               <div className="detail-hearts detail-list">
                 <div className="leftcol">
                   <img src={EAConfig.images.heart} className="icon"/>
                 </div>
                 <div className="rightcol">
                   <ul className="detail-hearts">
                     {this.props.likes.data.map(function(d) {
                        return <li>
                                 <a href={instaFetch.userUrl(d.username)}>
                                   {d.username}
                                 </a>&emsp;
                               </li>; })}
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
              <p>{this.props.data.text}</p>
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
        bodyScroll.unfix();
        mounted = undefined;
	React.unmountComponentAtNode(rootElt);
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
      var deferred = tumblrFetch.fetchNext();
      if (deferred) {
        deferred.done(function() {
          gallery.setProps({tumblr: tumblrFetch.items.slice()})
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
          NavDrawer.show(<About type="default" />);
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
                            created={1320232}
                            image={TumblrUtils.toImage(post)}
                            user={{profile_picture: TumblrVars.portraitUrl64,
                                   username: "jtmoulia"}}
                            tumblr={post}
                            active={type || "instagram"}
                            instagramID="536018816062052929_145884981"
	                    next={TumblrUtils.internalPostURL((id + 1).mod(tumblrFetch.items.length))}
		            prev={TumblrUtils.internalPostURL((id - 1).mod(tumblrFetch.items.length))}
	                   />);
        }
      },

      "/posts/instagram/:id/?(\\w+)?": function(rawId, type) {
        var id = parseInt(rawId);
        instaFetch.get(id).done(function(post) {
          if(post) {
            Details.show(
                <ImageDetails id={id}
                              url={instaFetch.eaUrl(id)}
                              caption={post.caption ? post.caption.text : undefined}
                              image={post.images.standard_resolution}
                              created={post.created_time}
                              user={post.user}
                              active={type || "instagram"}
                              instagram={post}
	                      next={instaFetch.eaUrl((id - 1).mod(instaFetch.limit))}
	                      prev={instaFetch.eaUrl((id + 1).mod(instaFetch.limit))}
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
