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
			client.executeOnBackground("ProductsFound", p );
		}
		if( pageType == 'PRODUCT_PAGE' )
		{
			let p = parser.getProductFromProductPage();
			console.log('Product page',p);
			let p2 = parser.getProductFromBuyBox();
			console.log("product page",p, "buy box product", p2 );
			client.executeOnBackground("ProductsFound",[p,p2 ]);
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

