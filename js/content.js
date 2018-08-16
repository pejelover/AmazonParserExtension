(function(){
var settings	= {
	'follow_products': false
	,'parse_satus'	: 'parse_enabled'
	,'follow_offers'	: false
	,'follow_stock'	: false
	,'close_tabs'	: false
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
		let p = parser.productPage.getProduct();

		if( p )
			client.executeOnBackground('ProductsFound',[ p ]);

		getPromise = ()=>
		{
			return PromiseUtils.resolveAfter(500,1 )
			.then(()=>{
				return parser.productPage.followProductOffers();
			});
		};

		if( settings.follow_offers )
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
		}
		else if( settings.close_tabs )
		{
			client.closeThisTab();
		}
	});
}

function parseCart()
{
	checkForRobots().then(()=>
	{
		let products = parser.cartPage.getProducts();
		let pWithStock = products.filter( i => i.stock.length > 0 );
		client.executeOnBackground('ProductsFound',pWithStock );

		return parser.cartPage.deleteItemsWithStock()
		.then(()=>
		{
			return parser.cartPage.parseAllTheStock( client ).then((products)=>
			{
				let notNullProducts = products.filter( p => p !== null );

				if( products.length )
					client.executeOnBackground('ProductsFound', notNullProducts );
			});
		});
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
	this.checkForRobots()
	.then(()=>
	{
		let p = parser.productSellersPage.getProduct();
		client.executeOnBackground("ProductsFound", [p] );
		console.log( p );

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
			//continueToCart();
			break;
		}
		case "VENDORS_PAGE":
		{
			parseVendorsPage();
			break;
		}
		case "PRODUCT_PAGE":
		{
			parseProductPage();
			break;
		}
		case "SEARCH_PAGE":
		{
			parseSearchPage();
			break;
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
