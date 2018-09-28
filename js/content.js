(function(){

var default_settings = {

	id: 1
	,parse_status	: false
	,page_product: {
		close_tab	: false
		,add_to_cart : false
		,close_if_stock_found: false
		,goto_sellers_pages	: false
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
		action	: 'do_nothing'
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
	return PromiseUtils.resolveAfter( 2000 ,1)
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
				if( seller_id !== settings.product_sellers_preferences[ p.asin ][ 0 ] )
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


		if( p.stock.length && p.stock[0].qty === 'Currently unavailable.' )
		{
			if( !isMerchantProduct )
			{
				seller_match = true;

				if( p.asin in settings.product_sellers_preferences )
					p.stock[0].seller_id = settings.product_sellers_preferences[ p.asin ][ 0 ];
			}
		}

		if( p.stock.length )
			client.executeOnBackground('StockFound',p.stock );

		if( p.stock.length && settings.page_product.close_if_stock_found && seller_match)
		{
			client.closeThisTab();
			return;
		}
		else if( settings.page_product.add_to_cart && seller_match )
		{
			if( !parser.productPage.addToCart() )
					parser.productPage.followPageProductOffers();
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

	let p = parser.cartPage.parseFirstItem();

	if( p !== null )
	{
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
			parser.cartPage.parseItemProcess( null )
			.then(( product )=>
			{
				client.executeOnBackground('StockFound', product.stock );
				parser.cartPage.removeItemByAsin( product.asin );

				return PromiseUtils.tryNTimes(()=>
				{
					let div = parser.cartPage.getCartItemByAsin( product.asin );

					if( div !== null )
					{
						parser.cartPage.removeItemByAsin( product.asin );
						return false;
					}

					return true;
				},300, 14);
			})
			.catch(()=>
			{
				console.log('It fails to parse and remove');
			})
			.finally(()=>
			{
				cart_blocked = false;
			});
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

	setTimeout(()=>{ location.reload();}, 5000 );

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
			cart_interval = setInterval( cartIntervalFunction, 500 );
		}
	});
}

function oldParseCart()
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
			return Promise.resolve( true );
		}
		else
		{
			return parser.cartPage.parseAllTheStock( client ).then((products)=>
			{
				let notNullProducts = products.filter( p => p !== null );

				let aSArray	= notNullProducts.reduce((array, product)=>
				{
					product.stock.forEach( a=> array.push( a ) );
					return array;
				},[]);

				if( aSArray.length )
					client.executeOnBackground('StockArray', aSArray );

				if( settings.page_cart.close_tab )
					client.closeThisTab();
			});
		}
	})
	.then(()=>
	{
		setTimeout(()=>{ window.location.reload(); }, 20000 );
	})
	.catch((e)=>
	{
		console.log( e );
		console.error('Error on parse cart', e );
	});
}

function parseSearchPage()
{
	checkForRobots().then(()=>
	{
		return client.waitTillReady( parser.getSearchListSelector(), false );
	})
	.then(()=>
	{
		let p = parser.parseProductSearchList();

		if( p.length == 0 )
			p = parser.parseProductSearchList2();

		if( p.stock.length )
			client.executeOnBackground('StockFound', p.stock );

		if( p.offers.length )
			client.executeOnBackground('OffersFound', p.offers );

		if( p.length )
			client.executeOnBackground('ProductsFound', p );

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
			if( settings.page_sellers.action === 'close_tab')
			{
				client.closeThisTab();
			}
			else if( settings.page_sellers.action === 'do_nothing' )
			{

			}
			else if( ["add_cart_first","add_cart_cheapest","add_cart_prime"].indexOf( settings.page_sellers.action ) !== -1 )
			{
				if( p.asin && p.asin in settings.product_sellers_preferences )
				{
					let search = settings.product_sellers_preferences[ p.asin ][ 0 ];

					if( search === 'ATVPDKIKX0DER' )
						search = 'amazon.com';

					if( !parser.productSellersPage.addToCartBySellerId( search ) )
					{
						if( parser.productSellersPage.hasNextPage() && settings.page_sellers.go_to_next )
						{
							PromiseUtils.resolveAfter( 1000, 1 )
							.then(()=>
							{
								parser.productSellersPage.goToNextPage();
							});
							return;
						}
						else
						{
							let x = d => d<10 ? "0"+d: d;

							client.executeOnBackground("StockFound",[{
								asin: p.asin
								,time: parser.productUtils.date.toISOString()
								,qty: "N/A"
								,is_prime: false
								,seller_id: settings.product_sellers_preferences[ p.asin ][0]
								,date: parser.productUtils.date.getFullYear()+"-"+x( parser.productUtils.date.getMonth()+1)+"-"+x( parser.productUtils.date.getDate() )
							}]);

							if( !parser.productSellersPage.addToCartBySellerId( 'amazon.com' ) )
							{
								this.client.closeThisTab();
								//parser.productSellersPage.addToCartFirstSeller();
							}
						}
					}
					else
					{
						return;
						//Found
					}
				}
				else
				{
					parser.productSellersPage.addToCartFirstSeller();
					return;
				}
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
	}
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

		if( !settingsIntialized )
		{
			settingsIntialized = true;

			parse();

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
				setInterval( checkUrl, 1000 );
		}
	});


	client.executeOnBackground
	(
		"UrlDetected"
		,{
			url: window.location.href
			,type: parser.getPageType( window.location.href )
		}
	);
}
})();
