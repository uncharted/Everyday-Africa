/** @jsx React.DOM */
"use strict";

(function($, _, React, Router) {
  Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
  }

  var Settings = {
    galleryBreakpoint: 600,
    mediumBreakpoint: 900
  };


  /**
   * Internal Helpers
   */

  function tumblrTagUrl(tag) {
    return TumblrVars.blogUrl + "/tagged/" + tag;
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

  /***************
   * Instagram API
   */
  var InstaFetch = {
    CLIENT_ID: "57dbff39f8dc4b659e6489ac6dd68b45",
    API_URL: "https://api.instagram.com/v1",
    cache: {},
    _order: [],

    _params: function() {
      return $.param({client_id: this.CLIENT_ID, callback: "?"});
    },

    _push: function(data) {
      this.cache[data.id] = data;
      this._order.push(data.id);
    },

    _fetcher: function(tag, total, url, deferred) {
      $.ajax({url: url, dataType: "jsonp"})
        .done(function(d) {
          d.data.forEach(function(datum) {
	    this._push(datum);
            deferred.notifyWith(this, [datum]);
          }.bind(this));
          if (total > _.size(this.cache)) {
            this._fetcher(tag, total, d.pagination.next_url, deferred)
          } else {
            deferred.resolveWith(this, [this.cache]);
          }
        }.bind(this))
        .fail(function(d) { deferred.rejectWith(this, [d]); });
    },

    populate: function(tag, total) {
      var url = this.API_URL + "/tags/" + tag + "/media/recent?" + this._params();
      var deferred = $.Deferred();

      this._fetcher(tag, total || 20, url, deferred);
      return deferred.promise();
    },

    /**
     * Get a single instagram media item, from the cache if possible
     *
     * Returns {meta: {...}, data: {...}} where `data` contains the data,
     * and meta is optional
     *  http://instagram.com/developer/endpoints/media/#get_media
     */
    get: function(id) {
      if (id in this.cache) {
        var resp = {data: this.cache[id]};
        return $.Deferred().resolveWith(this, [resp]).promise();
      } else {
        var url = this.API_URL + "/media/" + id + "?" + this._params();
        return $.ajax({url: url, dataType: "jsonp"})
          .done(function(d) {
            this._push(d.data);
          }.bind(this));
      }
    },

    userUrl: function(user) {
      return ["http://instagram.com", user].join("/");
    },

    eaUrl: function(id) {
      return "#/posts/instagram/" + id;
    },

    next: function(id, steps) {
      return this._order[(this._order.indexOf(id) + (steps || 1)).mod(this._order.length)];
    },

    prev: function(id, steps) {
      return this._order[(this._order.indexOf(id) - (steps || 1)).mod(this._order.length)];
    }
  };

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

      var buttonsStyle =
	{display: $(window).width() < Settings.mediumBreakpoint ?
	 'none' : 'inline-block' };

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
                                           onClick={function() {
                                             this.forceUpdate }.bind(this)}/>
                        </li>);
              })}
            </ul>
          </div>
           <h1><a href="/"><span className="everyday">Everyday</span>Africa</a></h1>
           <div id="share-buttons" className="nav-panel">
             <a href="http://instagram.com/everydayafrica"><img src={EAConfig.images.instagram} /></a>
             <a href="https://twitter.com/EverydayAfrica"><img src={EAConfig.images.twitter} /></a>
             <a href="https://www.facebook.com/everydayafrica"><img src={EAConfig.images.facebook} /></a>
             <a href="http://everydayafrica.tumblr.com/#me"><img src={EAConfig.images.tumblr} /></a>
           </div>
         </nav>);
    },

    menuHandler: function(e) {
      e.preventDefault();
      $("#nav-buttons").toggle();
    }
  });

  var NavToggleButton = React.createClass({
    render: function() {
      return (<a className="nav-button" href={this.props.href}>
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
  var Countries = React.createClass({
    render: function() {
      return (<div className="countries grid">
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
    render: function() {
      return (<div className="photographers grid">
                <h3>Photographers</h3>
                {_.map(this.props.data, function(p) {
                  return (<div className="photographer grid-item">
                            <a href={p.url}>
                              <img src="http://placehold.it/50x50" alt={p.name} />
                              <h4>{p.name}</h4>
                            </a>
                          </div>);
                }.bind(this))}
              </div>);
    }
  });

  var Search = React.createClass({
    render: function() {
      return (<div className="search">
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
    pages: {
      default: React.createClass({
        render: function() {
          return (<div>
                    <img src="http://25.media.tumblr.com/f40df582632484f1bc2db7e3d00deaf1/tumblr_n0l3ujEqBi1rgx8vno1_500.jpg" />
                    <p>
                      Hey there! This is an about page. Let us know what
                      content you would like to see here.
                    </p>
                  </div>);
        }
      }),
      etc: React.createClass({
        render: function() {
          return <p>... and etc ...</p>;
        }
      })
    },

    attrs: {
      className: "about"
    },

    render: function() {
      if (this.props.type in this.pages) {
        return (<div className="about">
                  <div className="about-nav nav-list">
                    <h3>About</h3>
                    <ul>
                      <li><a href="#/about/default">Summary</a></li>
                      <li><a href="#/about/etc">Etc</a></li>
                    </ul>
                  </div>
                  <div className="about-page">
                    {new this.pages[this.props.type](this.attrs)}
                  </div>
                </div>);
      }
    }
  });

  /********
   * Images
   */

  // The gallery of ALL images
  var Gallery = React.createClass({
    getInitialState: function() {
      return {data: []};
    },

    componentWillMount: function() {
      var total = TumblrVars.posts.photos.length * 24;
      InstaFetch.populate(this.props.tag, total)
        .done(function(d) {
          this.setState({
            data: _(d).values().first(total).map(function(media) {
              var img = media.images.low_resolution;
              return {
                id: media.id,
                url: img.url,
                width: img.width,
                height: img.height};
            })
            .value()
          });
        }.bind(this))
        .fail(function(d) {
            console.log("Failed to fetch tagged photos")
          });

      this.state.tumblrData = TumblrVars.posts.photos.map(function(photo, i) {
        function sizedProp(prop) {
          return photo[prop + "500"];
        };

        return {
          id: i,
          url: sizedProp('photoUrl'),
          width: sizedProp('photoWidth'),
          height: sizedProp('photoHeight')};
      });
    },

    render: function() {
      // Divide the images which fall on the left and the right
      var width = $(window).width();

      if (width > Settings.galleryBreakpoint) {
        var imageGroups = partition(this.state.data, 3);
        var sideLength = 0.1 * width;
        var centerLength = 0.4 * width;
        return (<div className="gallery desktop">
                  <GalleryColumn type="instagram" position="left" imageLength={sideLength} data={imageGroups[0]} />
                  <GalleryColumn type="tumblr" position="center" imageLength={centerLength} data={this.state.tumblrData} />
                  <GalleryColumn type="instagram" position="right" imageLength={sideLength} data={imageGroups[1]} />
              </div>);
        } else {
          var single = width / 3;
          var dbl = single * 2;

          var instaGen = (function(data) {
            var index = 0;
            return function() {
              if (index < data.length) {
                var insta = data[++index];
                return <TaggedImage className="mobile image instagram"
                                    key={insta.id}
                                    imageLength={single}
                                    type="instagram"
                                    image={insta} />;
              }
            };
          })(this.state.data);

          return (<div className="gallery mobile">
                    {_.map(this.state.tumblrData, function(p, i) {
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
                                               image={p} />
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
    render: function() {
      var classes = React.addons.classSet({
        'gallery-column': true,
        'left-column': this.props.position === "left",
        'right-column': this.props.position === "right",
        'center-column': this.props.position === "center"
      });

      return (<div className={classes}>
                {_(this.props.data).map(function(d) {
                  var isPortrait = d.height > d.width,
                      classes = React.addons.classSet({
                    'tagged-image': true,
                    image: true,
                    portrait: isPortrait,
                    landscape: !isPortrait});

                  return (<TaggedImage key={d.id}
                                       className={classes}
                                       imageLength={this.props.imageLength}
                                       type={this.props.type}
                                       image={d} />);
                }.bind(this))}
              </div>);
    }
  });

  // A single Image
  var TaggedImage = React.createClass({
    getDefaultProps: function() {
      return {scale: 1.2, duration: 200};
    },

    render: function() {
      var divStyle = {
        width: this.props.imageLength,
        height: this.props.imageLength,
        opacity: 0};
      var aStyle = _.pick(divStyle, ['width', 'height']);

      var imgStyle = {};

      if (this.props.image.width > this.props.image.height) {
        imgStyle.width = "140%";
      } else {
        imgStyle.height = "140%";
      }

      return (<div ref={this.props.key} className={this.props.className} style={divStyle}>
                 <a href={"#/posts/" + this.props.type + "/" + this.props.key}
                    style={aStyle}
                    onMouseEnter={this.mouseEnterHandler}
                    onMouseOut={this.mouseOutHandler}>
                   <img src={this.props.image.url} style={imgStyle} />
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

  // The Image detail view
  var ImageDetails = React.createClass({
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
        InstaFetch.get(this.props.instagramID).done(function(d) {
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

      return (<div className="detail" onKeyPress={this.keyPressHandler}>
                <div className="overlay"><a href="#/"></a></div>
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
                        <a href={InstaFetch.userUrl(this.props.user.username)}>
                          <h4>{this.props.user.username}</h4>
                        </a>
                        <h5>{moment.unix(this.props.created).fromNow()}</h5>
                      </div>
                      <a href="http://www.tumblr.com/follow/everydayafrica"
                         className="follow-link">Follow</a>
                    </div>
                    <p className="caption">{this.props.caption.replace("<p>", "").replace("</p>", "")}</p>
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
                      <TumblrDetails tags={this.props.tumblr.tags}
                                     notes={this.props.tumblr.notes}
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
                                 <a href={InstaFetch.userUrl(d.username)}>
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
                <p>{this.props.notes ? this.props.notes.count : "0"} Photo Reblogs</p>
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

    // Easy peasy responsive: Just update everything on resize
    $(window).resize(function() {
        gallery.forceUpdate();
        navBar.forceUpdate();
    });

    /**
     * Generate the toggleable modal
     *
     * props: {
     * }
     */
    function ComponentHandler($root) {
      var rootElt = $root.get(0);

      this.show = function(component) {
        this.dismiss();
        React.renderComponent(component, rootElt);
      };

      this.dismiss = function() {
        return React.unmountComponentAtNode(rootElt);
      };

      // A helper for the routing
      this.dismissFn = function() {
        return function() {
          this.dismiss();
        }.bind(this);
      }
    }

    var Details = new ComponentHandler($("#modal"));
    var NavDrawer = new ComponentHandler($("#nav-drawer"));


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

      "/posts/tumblr/:id/?(\\w+)?": function(id, type) {
        var post = TumblrVars.posts.photos[id];
        if(post) {
          Details.show(
              <ImageDetails id={id}
                            url={"#/posts/tumblr/" + id + "/instagram"}
                            caption={post.caption}
                            created={1320232}
                            image={{url: post.photoUrl500,
                                    width: post.photoWidth500,
                                    height: post.photoHeight500}}
                            user={{profile_picture: TumblrVars.portraitUrl64,
                                   username: "jtmoulia"}}
                            tumblr={post}
                            active={type || "tumblr"}
                            instagramID="536018816062052929_145884981" />);
        }
      },

      "/posts/instagram/:id/?(\\w+)?": function(id, type) {
        InstaFetch.get(id).done(function(d) {
          var post = d.data
          if(post) {
            Details.show(
                <ImageDetails id={id}
                              url={InstaFetch.eaUrl(id)}
                              caption={post.caption.text}
                              image={post.images.standard_resolution}
                              created={post.created_time}
                              user={post.user}
                              active={type || "instagram"}
                              instagram={post}
	                      next={InstaFetch.eaUrl(InstaFetch.next(id))}
	                      prev={InstaFetch.eaUrl(InstaFetch.prev(id))}
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
