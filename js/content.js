var parseOnlyOneVendor	= true;
var parser 				= new AmazonParser();
var client= new Client();


function parse()
{
	PromiseUtil.resolveAfter( 400 ,1)
	.then(()=>
	{
		let robotsRegex =/Robot\s+Check/i;

		if( robotsRegex.test( document.title ) )
		{
			return new Promise((resolve,reject)=>
			{
				let intervalId = 0;
				let lambda		= ()=>{
					if( !robotsRegex.test( document.title ) )
					{
						console.log('Checking Again');
						clearInterval( interval_id );
						resolve(1);
					}
				};

				interval_id = setInterval( lambda, 5000 );
			});
		}
		return Promise.resolve( true );
	})
	.then(()=>
	{
		let pageType	= parser.getPageType( window.location.href );

		if( pageType == 'SEARCH_PAGE' )
		{
			let p = parser.parseProductSearchList();
			if( p.length == 0 )
				p = parser.parseProductSearchList2();

			if( p.length )
				client.executeOnBackground("ProductsFound", p );
		}

		if( pageType == 'PRODUCT_PAGE' )
		{
			let products = [];
			let p = parser.getProductFromProductPage();
			if( p )
				products.push( p );

			let p2 = parser.getProductFromBuyBox();

			if( p2 )
				products.push( p2 );

			console.log("product page",p, "buy box product", p2 );

			if( products.length )
				client.executeOnBackground("ProductsFound",products );
		}
	})
	.catch((e)=>
	{
		console.log( e );
	});
}



last_url = window.location.href;

function checkUrl()
{
	if( last_url !== window.location.href )
	{
		last_url = window.location.href;
		parse();
	}
}

parse();

setInterval( checkUrl, 700 );

