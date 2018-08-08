
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
		let products = [];
		let p = parser.getProductFromProductPage();

		if( p )
			products.push( p );

		let p2 = parser.getProductFromBuyBox();

		if( p2 )
			products.push( p2 );

		console.log('product page',p, 'buy box product', p2 );

		if( products.length )
			client.executeOnBackground('ProductsFound',products );

		if( settings.follow_offers )
		{
			parser.followPageProductOffers();
		}
		else if( parser )
		{

		}
	});
}

function parseCart()
{
	checkForRobots().then(()=>
	{

		if( settings.follow_stock )
		{
			parser.parseAllTheStockFromCart( client )
			.then((products)=>
			{
				let clean = products.filter( i=> i!= null );
				if( clean.length )
					client.executeOnBackground("ProductsFound", clean );
			});
		}
		else
		{
			let p = parser.getProductsFromCart();

			console.log( p );

			if( p.length )
				client.executeOnBackground('ProductsFound',p );
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
		let p = parser.getProductFromSellersPage();
		client.executeOnBackground('ProductsFound',[p] );
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
			continueToCart();
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
