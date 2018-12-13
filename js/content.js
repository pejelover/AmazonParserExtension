
(function(){


var settings	= default_settings;
var parserSettings	= {};

var parser	= new AmazonParser( parserSettings );
var client	= new Client();
var last_url = window.location.href;

function checkForRobots()
{
	return PromiseUtils.resolveAfter( 500 ,1)
	.then(()=>
	{
		let robotsRegex =/Robot\s+Check/i;

		if( robotsRegex.test( document.title ) )
		{
			return new Promise((resolve,reject)=>
			{
				let interval_id = 0;
				let lambda		= ()=>
				{
					if( !robotsRegex.test( document.title ) )
					{
						clearInterval( interval_id );
						resolve( 1 );
					}
				};

				interval_id = setInterval( lambda, 5000 );
			});
		}
		else if( /Page Not Found/.test( document.title ) )
		{
			let asin = parser.getAsinFromUrl( window.location.href );
			client.executeOnBackground('PageNotFound',{ asin: asin });
			client.closeThisTab();
		}

		return Promise.resolve( true );
	});
}

function parseProductPage()
{
	if( 'timeout' in settings.page_product && settings.page_product.timeout && !isNaN( settings.page_product.timeout ) && settings.timeout > 0 )
	{
		setTimeout(()=>{ client.closeThisTab();}, settings.page_product.timeout*1000  );
	}

	checkForRobots().then(()=>
	{
		let colorVariations	= parser.productPage.parseVariationColorUrls();
		let sizeVariations = parser.productPage.parseVariationSizeUrls();
		let paternVariations = parser.productPage.parseVariationUrlsFromPattern();

		let allUrls = colorVariations.concat( sizeVariations, paternVariations ).map( p =>
		{
			return { url: p, type: parser.getPageType( p ), time: parser.productUtils.getTime() };
		});


		if( allUrls.length )
			client.executeOnBackground('AddUrls', allUrls );

		let p = parser.productPage.getProduct();

		if( p )
			client.executeOnBackground('ProductsFound', [ p ] );

		if( p && p.offers.length )
			client.executeOnBackground('OffersFound', p.offers );

		if( p && p.stock.length )
			client.executeOnBackground('StockFound',p.stock );

		let seller_id = null;

		if( p.stock.length && 'seller_id' in p.stock[0] )
		{
			seller_id = p.stock[0].seller_id;
		}

		if( p.offers.length && 'seller_id' in p.offers[0] )
		{
			seller_id = p.offers[0].seller_id;
		}



		let seller_match = true;

		let isMerchantProduct  	= false;
		let merchantId			= null;

		let params = parser.getParameters( window.location.href );

		if( params.has( 'm' ) )
		{
			isMerchantProduct = true;
			merchantId	= params.get('m');

			if( p.stock.length )
				p.stock[0].seller_id = merchantId;
		}


		if( p.stock.length )
			client.executeOnBackground('StockFound',p.stock );

		Promise.resolve(1)
		.then(()=>
		{
			if( p.stock.length && settings.page_product.close_if_stock_found )
			{
				if( p.asin in settings.product_sellers_preferences )
				{
					if( settings.product_sellers_preferences[ p.asin ].indexOf( p.stock[0].seller_id ) !== -1 )
					{
						client.closeThisTab();
						return Promise.reject('Closing tab');
					}
					return Promise.resolve('No stock found for seller');
				}
				else
				{
					client.closeThisTab();
					return Promise.reject('Closing tab');
				}
			}
			return Promise.resolve('No stock found for seller');
		})
		.then(()=>
		{
			//Add if add by sellers preference
			return new Promise((resolve,reject)=>
			{
				if( settings.page_product.add_by_seller_preferences )
				{
					if(
						p.offers.length
						&& p.asin in settings.product_sellers_preferences
						&& settings.product_sellers_preferences[ p.asin ].indexOf(  p.offers[0].seller_id  ) !== -1 )
					{
						PromiseUtils.tryNTimes(()=>
						{
							return parser.productPage.addToCart();
						},1500, 3 )
						.then(()=>
						{
							if( settings.page_previous_cart.action === 'close_tab' )
							{
								PromiseUtils.resolveAfter( 1, 4000 ).then(()=>
								{
									client.closeThisTab();
								});
							}
							reject('Product added');
						})
						.catch(()=>
						{
							resolve('Add to cart not found');
						});
					}
				}
				resolve('No added to cart by sellers preference');
			});
		})
		.then(()=>
		{
			return new Promise((resolve,reject)=>
			{
				//Add to cart enable
				if( settings.page_product.add_to_cart )
				{
					PromiseUtils.tryNTimes(()=>
					{
						return parser.productPage.addToCart();
					},1500, 3 )
					.then(()=>
					{
						if( settings.page_previous_cart.action === 'close_tab' )
						{
							PromiseUtils.resolveAfter( 1, 4000 ).then(()=>
							{
								client.closeThisTab();
							});
						}
						reject('Product added');
					})
					.catch(()=>
					{
						resolve('Add to cart not found');
					});
				}
				else
				{
					resolve('No add options in settings');
				}
			});
		})
		.then((result)=>
		{
			if( settings.page_product.goto_sellers_pages )
			{
				return new Promise((resolve,reject)=>
				{
					return PromiseUtils.tryNTimes(()=>
					{
						return parser.productPage.followPageProductOffers();
					},1000,3)
					.then(()=>
					{
						reject('Goint to page products');
					})
					.catch(()=>
					{
						resolve('Fail to add pageProducts');
					});
				});
			}
			else
			{
				Promise.resolve('No go to sellers page set');
			}
		})
		.then(()=>
		{
			//Last Option
			if( settings.page_product.close_tab )
			{
				client.closeThisTab();
				return Promise.reject('Close tab(settings)');
			}
		})
		.catch((result)=>
		{
			console.log('Last options was', result );
		});
	});
}

let cart_interval	= -1;
let cart_blocked	= false;

function cartIntervalFunction()
{
	if( cart_blocked )
		return;

	cart_blocked = true;

	let savedForLater = parser.cartPage.getSaveForLaterCount();

	if( savedForLater > 2 )
	{
		document.body.setAttribute('style',"background: red;");
	}

	let p = parser.cartPage.parseLastItem();

	if( p !== null )
	{

		if( 'url' in p && p.url )
		{
			let url = { url: p.url, type: parser.getPageType( p.url ), time: parser.productUtils.getTime() };
			client.executeOnBackground('AddUrls', [url] );
		}

		if( p.stock.length )
		{
			client.executeOnBackground('StockFound', p.stock );

			let func	= ()=>
			{
				parser.cartPage.removeItemByAsin( p.asin );

				let item = parser.cartPage.getCartItemByAsin( p.asin );

				return  item !== null;
			};

			PromiseUtils.tryNTimes( func, 500, 12 )
			.catch((e)=>
			{
				console.log('It fails to remove element from cart');
			})
			.finally(()=>
			{
				cart_blocked = false;
			});
			return;
		}
		else
		{
			let asin = parser.cartPage.getLastCartItemAsin();

			if( asin !== null )
			{
				parser.cartPage.parseItemProcess( asin )
				.then(( product )=>
				{
					client.executeOnBackground('StockFound', product.stock );
					parser.cartPage.removeItemByAsin( product.asin );

					return PromiseUtils.tryNTimes(()=>
					{
						let div = parser.cartPage.getCartItemByAsin(  asin );

						if( div !== null )
						{
							parser.cartPage.removeItemByAsin( asin );
							return false;
						}

						return true;
					},300, 14);
				})
				.catch(( e )=>
				{
					console.log('It fails to parse and remove', e);
				})
				.finally(()=>
				{
					cart_blocked = false;
				});
				return;
			}
			cart_blocked = false;
		}

		return;
	}

	if( savedForLater > 0 )
	{
		let p = parser.cartPage.getSavedForLaterProduct( null );

		if( p !== null && p.stock.length > 0 )
		{
			client.executeOnBackground('StockFound', p.stock );

			parser.cartPage.removeSavedForLater( p.asin );

			let fun	= ()=>
			{
				let div = parser.cartPage.getSavedForLaterItem( p.asin );
				if( div == null )
					return true;

				parser.cartPage.removeSavedForLater( p.asin );
				return false;
			};

			PromiseUtils.tryNTimes( fun, 600, 20 )
			.finally(()=>
			{
				cart_blocked = false;
			});
			return;
		}

		parser.cartPage.moveToCartSaveForLater( null );
		PromiseUtils.resolveAfter( 1000, 1)
		.finally(()=>
		{
			cart_blocked = false;
		});
		return;
	}

	if( settings.page_cart.close_tab )
	{
		client.closeThisTab();
	}
	else
	{
		setTimeout(()=>{ location.reload();}, 5000 );
		clearInterval( cart_interval );
	}

	cart_blocked = false;
}

function parseCart()
{
	checkForRobots().then(()=>
	{
		if( !settings.page_cart.parse_stock )
		{
			let products = parser.cartPage.getProducts();

			let stockArray = products.reduce((array, product)=>
			{
				product.stock.forEach( a=> array.push( a ) );
				return array;
			},[]);


			if( stockArray.length )
				client.executeOnBackground('StockFound', stockArray );
		}
		else
		{
			if( cart_interval === -1 )
				cart_interval = setInterval( cartIntervalFunction, 500 );
		}
	});
}

function parseSearchPage()
{
	checkForRobots().then(()=>
	{
		return PromiseUtils.tryNTimes(()=>
		{
			let c = document.querySelectorAll( parser.getSearchListSelector( 15 ) );
			if( c.length === 0 )
				return false;

			return true;
		},1000,6);
	})
	.finally(()=>
	{
		let products = parser.merchantProductsPage.parseProductSearchList();

		if( products.length == 0 )
			products = parser.parseProductSearchList2();

		let offers = products.reduce((p,c)=>
		{
			if(!c || !('seller_id' in  c) )
				return p;

			c.offers.forEach((offer)=>p.push( offer ) );
			return p;
		},[]);

		let stocks = products.reduce((p,c)=>
		{
			if(!c ||  !('seller_id' in c) )
				return p;

			c.stock.forEach((stock)=>p.push( stock ) );
			return p;
		},[]);

		if( offers.length )
			client.executeOnBackground('OffersFound',offers );

		if( stocks.length )
			client.executeOnBackground('StockFound',stocks );

		let links = parser.getAllLinks();
		client.executeOnBackground('AddUrls', links );
		return PromiseUtils.resolveAfter(true,1500);
	})
	.then(()=>
	{
		let next = document.querySelector('#pagnNextLink');
		if( next )
		{
			next.click();
		}
		else
		{
			document.body.setAttribute('background-color: red');
		}
	})
	.catch((error)=>
	{
		console.error('Error on parseSearchPage', error );
	});
}

function parseVendorsPage()
{
	checkForRobots()
	.then(()=>
	{
		let p = parser.productSellersPage.getProduct();

		if( p.stock.length )
			client.executeOnBackground('StockFound', p.stock );

		if( p.offers.length )
			client.executeOnBackground('OffersFound', p.offers );

		//client.executeOnBackground("ProductsFound", [p] );

		PromiseUtils.resolveAfter( 1000, 1000 )
		.then(()=>
		{
			//One day fullfilled by amazon
			//page_sellers.add_by_seller_preferences_next_day = 'add_by_seller_preferences_next_day' in page_sellers;
			//page_sellers.add_by_seller_preferences_amazon = 'add_by_seller_preferences_amazon' in page_sellers;
			//page_sellers.add_by_seller_preferences_vendor = 'add_by_seller_preferences_vendor' in page_sellers;

			if( settings.page_sellers.add_by_seller_preferences_next_day
				&& settings.page_sellers.add_by_seller_preferences_amazon
				&& p.asin in settings.product_sellers_preferences )
			{
				return PromiseUtils.resolveAfter(1500,1500).then(()=>
				{
					let is_one_day_shipping = true;
					let fullfilled_by_vendor = false;
					let fullfilled_by_amazon = true;

					let addedToCart = settings.product_sellers_preferences[ p.asin ].some((seller_id)=>
					{
						let search = seller_id;

						if( search === 'ATVPDKIKX0DER' )
							search = 'amazon.com';

						return parser.productSellersPage.addToCartBySellerId( search, is_one_day_shipping, fullfilled_by_vendor, fullfilled_by_amazon );
					});

					return ! addedToCart ? Promise.resolve('No found no one day fullfilled by amazaon') : Promise.reject( 'Found no one day  && fullfilled by amazon');
				})
			}

			return Promise.resolve('No, one Day and fullfilled by amazon options');
		})
		.then(()=>
		{
			//No one day, fullfilled by amazon
			if( settings.page_sellers.add_by_seller_preferences_no_next_day
				&& settings.page_sellers.add_by_seller_preferences_amazon
				&& p.asin in settings.product_sellers_preferences )
			{
				let is_one_day_shipping = false;
				let fullfilled_by_vendor = false;
				let fullfilled_by_amazon = true;

				let addedToCart = settings.product_sellers_preferences[ p.asin ].some((seller_id)=>
				{
					let search = seller_id;

					if( search === 'ATVPDKIKX0DER' )
						search = 'amazon.com';

					return parser.productSellersPage.addToCartBySellerId( search, is_one_day_shipping, fullfilled_by_vendor, fullfilled_by_amazon );
				});

				return !addedToCart ? Promise.resolve('No found no one day shipping && fullfilled by amazaon') : Promise.reject( 'Found no one day && fullfilled by amazon');
			}

			return Promise.resolve('No found Seller && fullfilled by amazaon');
		})
		.then(()=>
		{
			//No one day, fullfilled by vendor
			if( settings.page_sellers.add_by_seller_preferences_vendor && p.asin in settings.product_sellers_preferences )
			{
				let is_one_day_shipping = false;
				let fullfilled_by_vendor = true;
				let fullfilled_by_amazon = false;

				let addedToCart = settings.product_sellers_preferences[ p.asin ].some((seller_id)=>
				{
					let search = seller_id;

					if( search === 'ATVPDKIKX0DER' )
						search = 'amazon.com';

					return parser.productSellersPage.addToCartBySellerId( search, is_one_day_shipping, fullfilled_by_vendor, fullfilled_by_amazon );
				});

				return !addedToCart ? Promise.resolve('No found Seller && no fullfilled by vendor') : Promise.reject( 'Found seller && fullfilled by vendor');
			}

			return Promise.resolve('No found Seller && fullfilled by amazon');
		})
		.then(()=>
		{
			if( settings.page_sellers.go_to_next )
			{
				PromiseUtils.resolveAfter( 1000, 1 )
				.then(()=>
				{
					return parser.productSellersPage.goToNextPage()
						? Promise.reject('Goin to next page')
						: Promise.resolve('No next page found');
				});
			}

			return Promise.resolve('No Next Page Found');
		})
		.then((result)=>
		{
			//Add first prime
			if( settings.page_sellers.add_first_prime )
			{
				if( parser.productSellersPage.addToCartFirstPrime() )
					return Promise.reject('Added first prime');
			}
			return Promise.resolve('No first prime');
		})
		.then(()=>
		{
			if( settings.page_sellers.add_if_only_one )
			{
				if( p.offers.length === 1 && !parser.productSellersPage.hasNextPage() && !parser.productSellersPage.hasPrevPage() )
				{
					if( parser.productSellersPage.addToCartFirstSeller() )
					{
						Promise.reject('Added First Seller');
					}
				}
			}
			return Promise.resolve('No add if only one');
		})
		.then(()=>
		{
			if( settings.page_sellers.close_tab )
			{
				client.closeThisTab();
				return Promise.reject('Close option reached');
			}
			return Promise.reject('No More option found');
		})
		.catch((result)=>
		{
			console.log('Result was ', result);
		});
	})
	.catch((error)=>
	{
		console.error('Error on parseVendorsPage', error );
	});
}


client.addListener('ExtractAllLinks',()=>
{
	let links = parser.getAllLinks();
	client.executeOnBackground('AddUrls', links );
});

client.addListener("ParseAgain",()=>
{
	parse();
});

function parse()
{
	//var parseOnlyOneVendor	= true;

	let page_type = parser.getPageType( window.location.href );

	switch( page_type )
	{
		case "CART_PAGE":
		{
			parseCart();
			break;
		}
		case "HANDLE_BUY_BOX":
		case "PREVIOUS_TO_CART_PAGE":
		{
			/*
			,previous_to_cart:
			{
				close_tab	: false
				,action		: 'do_nothing'
			}
			*/

			if( settings.page_previous_cart.action !== 'do_nothing' )
			{
				console.log('Content::P2CHE',parser.prev2cart.hasError() );

				if( parser.prev2cart.hasError() )
				{
					window.history.back();
					return;
				}
			}

			switch( settings.page_previous_cart.action )
			{
				case 'do_nothing': break;
				case 'close_tab': client.closeThisTab();return;
				case 'continue':
				{
					try{
						document.getElementById('hlb-view-cart-announce').click();
					}
					catch(e)
					{
						console.log('PTC::BS');
					}
					return;
				}
				default:
					console.error('Invalid option '+settings.page_previous_cart.action );
					return;
			}
			return;
		}
		case "VENDORS_PAGE":
		{
			parseVendorsPage();
			return;
		}
		case "PRODUCT_PAGE":
		{
			parseProductPage();
			return;
		}
		case "SEARCH_PAGE":
		{
			parseSearchPage();
			return;
		}
		case "MERCHANT_PRODUCTS":
		{
			parseSearchPage();
			//parseMerchantProducts();
		}
	}
}



function parseMerchantProducts()
{
	//PromiseUtils.resolveAfter( 1, 2000 ).then(()=>
	//{
	//	let allLinks = parser.getAllLinks();
	//	client.executeOnBackground('AddUrls',allLinks );
	//	return PromiseUtils.resolveAfter(1, 1500 );
	//})
	//.then(()=>
	//{
	//	parser.merchantProductsPage.goToNextPage();
	//});

	parseSearchPage();
}



let checkInterval = null;
var settingsIntialized = false;

if(  window.location.hostname === 'www.amazon.com' )
{
	client.addListener("SettingsArrive",(newSettings)=>
	{
		settings	= newSettings;

		if( settings.parse_status === "parse_disabled" )
			return;

		let type = parser.getPageType( window.location.href );
		if( type === 'PREVIOUS_TO_CART_PAGE' && settings.page_previous_cart.action === 'close_tab' )
		{
			client.closeThisTab();
			return;
		}

		parse();
	});

	window.addEventListener('load',()=>
	{
		console.log('DOcument Load');
		client.executeOnBackground
		(
			"UrlDetected"
			,{
				url: window.location.href
				,type: parser.getPageType( window.location.href )
			}
		);
	});


	let checkUrl = ()=>
	{
		if( last_url !== window.location.href )
		{
			last_url = window.location.href;
			client.executeOnBackground
			(
				"UrlDetected"
				,{ url: window.location.href, type: parser.getPageType( window.location.href ) }
			);
		}
	};

	if( checkInterval === null )
		setInterval( checkUrl, 1500 );
}

})();
