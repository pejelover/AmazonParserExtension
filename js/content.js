
(function(){


var default_settings = {

	id: 1
	,parse_status	: false
	,page_product: {
		close_tab	: false
		,add_to_cart : false
		,close_if_stock_found: false
		,goto_sellers_pages	: false
		,timeout	: 0
	}
	,page_cart:
	{
		parse_stock	: false
		,close_tab	: false
	}
	,page_previous_cart:
	{
		close_tab	: false
		,action		: 'do_nothing'
	}
	,page_sellers:
	{
		add_first	: false
		,add_amazon : false
		,add_first_prime: true
		,close_tab	: false
		,go_to_next	: false

	}
	,product_sellers_preferences: {
	}
};

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


		if('product_sellers_preferences' in settings && settings.product_sellers_preferences )
		{
			if( p.asin in settings.product_sellers_preferences )
			{
				if( settings.product_sellers_preferences[ p.asin ].indexOf( seller_id ) === -1 )
				{
					seller_match = false;
				}
			}
		}

		let isMerchantProduct  	= false;
		let merchantId			= null;

		let params = parser.getParameters( window.location.href );

		if( params.has( 'm' ) )
		{
			isMerchantProduct = true;
			merchantId	= params.get('m');
		}


		if( p.stock.length && ( p.stock[0].qty === 'Currently unavailable.' || p.stock[0].qty === 0 ) )
		{
			if( !isMerchantProduct )
			{
				seller_match = true;

				if( p.asin in settings.product_sellers_preferences )
					p.stock[0].seller_id = settings.product_sellers_preferences[ p.asin ][ 0 ];
			}
			else
			{
				p.stock[0].seller_id = merchantId;
			}
		}

		if( p.stock.length )
			client.executeOnBackground('StockFound',p.stock );

		if( p.stock.length && settings.page_product.close_if_stock_found && seller_match)
		{
			client.closeThisTab();
			return;
		}
		else if( settings.page_product.add_to_cart )
		{
			if( !parser.productPage.addToCart() )
			{
				let func= ()=> {
					console.log('Trying another');
					return parser.productPage.followPageProductOffers();
				};

				PromiseUtils.tryNTimes( func, 500, 20 ).catch((e)=>
				{
					console.log( e );
					//document.body.setAttribute("style","background-color:red");
				});
			}
			return;
		}
		else if( settings.page_product.goto_sellers_pages )
		{
			if( isMerchantProduct )
			{
				window.location.href = window.location.href.replace('m='+merchantId,'');
				return;
			}
			let func= ()=> {
				console.log('Trying another');
				return parser.productPage.followPageProductOffers();
			};

			PromiseUtils.tryNTimes( func, 500, 10 ).catch((e)=>
			{
				parser.productPage.followAlternateProductOffers();
				console.log( e );
				//document.body.setAttribute("style","background-color:red");
			});
			return;
		}
		else if( settings.page_product.close_tab )
		{
			client.closeThisTab();
			return;
		}
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
			if('seller_id' in  c )
				return p;

			c.offers.forEach((offer)=>p.push( offer ) );
			return p;
		},[]);

		let stocks = products.reduce((p,c)=>
		{
			if( 'seller_id' in c )
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

		return PromiseUtils.resolveAfter( 1, 2000 )
		.then(()=>
		{
			let addedToCart = false;

			if( p.asin in settings.product_sellers_preferences )
			{
				addedToCart = settings.product_sellers_preferences[ p.asin ].some((seller_id)=>
				{
					let search = seller_id;

					if( search === 'ATVPDKIKX0DER' )
						search = 'amazon.com';

					return parser.productSellersPage.addToCartBySellerId( search );
				});
			}


			if( addedToCart )
				return;

			if( settings.product_sellers_preferences[ p.asin ] && parser.productSellersPage.hasNextPage() && settings.page_sellers.go_to_next )
			{
				PromiseUtils.resolveAfter( 1000, 1 )
				.then(()=>
				{
					parser.productSellersPage.goToNextPage();
				});
				return;
			}

			if( settings.page_sellers.add_amazon && parser.productSellersPage.addToCartBySellerId( 'amazon.com' ) )
			{
				return;
			}



			if( settings.page_sellers.add_first_prime &&  parser.productSellersPage.addToCartFirstPrime() )
			{
				return;
			}


			if( parser.productSellersPage.hasNextPage() && settings.page_sellers.go_to_next )
			{
				PromiseUtils.resolveAfter( 1000, 1 )
				.then(()=>
				{
					parser.productSellersPage.goToNextPage();
				});
				return;
			}

			//if( settings.page_sellers.add_first
			//	&& parser.productSellersPage.isFirstPage()
			//	&& parser.productSellersPage.addToCartFirstSeller() )
			//{
			//	return;
			//}


			if( settings.page_sellers.add_if_only_one )
			{

				//return;
			}

			if( settings.page_sellers.close_tab )
			{
				client.closeThisTab();
				return;
			}
		});
	})
	.catch((error)=>
	{
		console.error('Error on parseVendorsPage', error );
	});
}


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
