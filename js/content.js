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
	return PromiseUtils.resolveAfter( 400 ,1)
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

		return Promise.resolve( true );
	});
}

function parseProductPage()
{
	checkForRobots().then(()=>
	{

			/*
		page_product: {
		close_tab	: false
		,add_to_cart : false
		,close_if_stock_found: false
		,goto_sellers_pages	: false
		} */

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
			parser.productPage.addToCart();
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

			PromiseUtils.tryNTimes( func, 250, 15 ).catch((e)=>
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

function parseCart()
{
	checkForRobots().then(()=>
	{

		/*
	,page_cart:
	{
		parse_stock	: false
		,close_tab	: false
	} */

		let products = parser.cartPage.getProducts();

		//client.executeOnBackground('ProductsFound', products );
		let stockArray = products.reduce((array, product)=>
		{
			product.stock.forEach( a=> array.push( a ) );
			return array;
		},[]);



		if( stockArray.length )
			client.executeOnBackground('StockFound', stockArray );



		if( settings.page_cart.parse_stock )
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
	.catch((e)=>
	{
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

		client.executeOnBackground("ProductsFound", [p] );

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
						if( parser.productSellersPage.hasNextPage() )
						{
							PromiseUtils.resolveAfter( 1000, 1 )
							.then(()=>
							{
								parser.productSellersPage.goToNextPage();
							});
						}
						else
						{
							console.log('No Next');
						}
					}
					else
					{
						console.log('No Next');
					}
				}
				else
				{
					parser.productSellersPage.addToCartFirstSeller();
				}
			}
		});
	})
	.catch((error)=>
	{
		console.error('Error on parseVendorsPage', error );
	});
}


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

if(  window.location.hostname === 'www.amazon.com' )
{
	client.addListener("SettingsArrive",(newSettings)=>
	{
		settings	= newSettings;

		if( settings.parse_status === "parse_disabled" )
			return;

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
			setInterval( checkUrl, 300 );
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
