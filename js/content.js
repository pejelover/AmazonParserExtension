(function(){

	var default_settings = {
	page_product: {
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
	,previous_to_cart:
	{
		close_tab	: false
		,action		: 'do_nothing'
	}
	,page_sellers:
	{


	}
};

var parser	= new AmazonParser();
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
			client.executeOnBackground('ProductsFound',[ p ]);


		if( p.stock.length && settings.page_product.close_if_stock_found )
		{
			client.closeThisTab();
			return;
		}
		else if( settings.page_product.goto_sellers_pages )
		{
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
		else if( settings.page_product.add_to_cart )
		{
			parser.productPage.addToCart();
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

		client.executeOnBackground('ProductsFound', products );


		if( settings.page_cart.parse_stock )
		{
			return parser.cartPage.parseAllTheStock( client ).then((products)=>
			{
				let notNullProducts = products.filter( p => p !== null );

				if( notNullProducts.length )
					client.executeOnBackground('ProductsFound', notNullProducts );

				if( settings.close_tabs )
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
		return client.waitTillReady( parser.getSearchListSelector() );
	})
	.then(()=>
	{
		let p = parser.parseProductSearchList();

		if( p.length == 0 )
			p = parser.parseProductSearchList2();

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
		client.executeOnBackground("ProductsFound", [p] );

		if( p.offers.length === 1 )
		{
			console.log("adding to cart");
			parser.productSellersPage.addToCartFirstSeller();
		}

		if( settings.follow_stock )
		{
			if( settings.sellers_lists )
			{

			}
			else if( p.offers.length == 1 )
			{

			}
		}
		else
		{
			//document.body.setAttribute("style","background-color:red");
		}
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
			parseCart( client );
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
