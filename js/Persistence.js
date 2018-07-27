
class Persistence
{
	constructor()
	{
		this.db = new DatabaseStore
		({
			name		: "products"
			,version	: 1
			,stores		:{
				products:
				{
					keyPath	: 'asin'
					,autoincrement: false
					,indexes	:
					[
						{ indexName : "producer"	,keyPath:"producer" ,objectParameters: { uniq: false, multientry: false} }
						,{ indexName	: "parsedDates"	,keyPath:"offers"	,objectParameters: { uniq: false ,multiEntry: true} }
						,{ indexName	: "sellers"	,keyPath:"sellers"	,objectParameters: { uniq: false ,multiEntry: true} }
						,{ indexName	: "search"	,keyPath:"search"	,objectParameters: { uniq: false ,multiEntry: true} }
					]
				}
			}
		});

		this.db.init();
	}

	updateProduct(product)
	{
		return this.db.get("products",product.asin ).then((oldProduct)=>
		{
			if( oldProduct )
				this.mergeProducts(oldProduct, product );

			return this.db.put("products", product );
		}).catch((e)=>
		{
			console.error("product not found", e );
			return Promise.resolve( product );
			//return this.put("products", product );
		});
	}

	sortProductList( list )
	{
		list.sort((a,b)=>
		{
			return a.asin < b.asin ? -1 : 1;
		});
	}

	updateProductLists(list)
	{
		return PromiseUtil.runSequential( list, (newProduct,index)=>
		{
			return this.updateProduct( newProduct );
		});
	}

	overlapingInfo( from, to,key ,lambda )
	{
		if( !from || !to  )
			return;

		let aKeys	= {};
		let isFunc  = typeof key === "function";

		if( key == null )
		{
			to.forEach( i => aKeys[ i ] = 1 );

			from.forEach((i)=>
			{
				lambda( i, i in aKeys );

			});
		}
		else
		{
			to.forEach((i)=>
			{
				aKeys[ isFunc ? key( i ) : to[ key ] ] = i;
			});

			from.forEach((i)=>
			{
				let bKey = isFunc ? key( i ) : from[ key ];
				lambda( i, bKey in aKeys );
			});
		}
	}

	mergeProducts( oldProduct, newProduct )
	{
		let keys = Object.keys( oldProduct );

		let arraysKeys	= {
			'offers'		:false
			,'stock'		:false
			,'merchants'	:false
			,'search'		:true
			,'qids'			:true
			,'sellers'		:true
			,'merchants_ids':true
		};

		keys.forEach((k)=>
		{
			if( k in arraysKeys )
			{
				if( arraysKeys[ k ] )
				{
					this.overlapingInfo( oldProduct[ k ], newProduct[ k ], null, (element,isOverlap )=>
					{
						if( !isOverlap )
							newProduct[ k ].push( element );
					});
				}
				return;
			}

			if( (k in newProduct && newProduct[ k ] ) || k in arraysKeys  )
				return;

			newProduct[ k ] = oldProduct[ k ];
		});

		if( !newProduct.stock )
			newProduct.stock = [];

		this.overlapingInfo( oldProduct.stock, newProduct.stock, "date", (element,isOverlap)=>
		{
			if( !isOverlap )
				newProduct.stock.push( element );
		});

		if( !newProduct.offers )
			newProduct.offers = [];

		this.overlapingInfo
		(
			oldProduct.offers
			,newProduct.offers
			,(offer)=>
			{
				return offer.date+' '+offer.sellerName+' '+( offer.isPrime ? 'prime' :'' )+( 'condition' in offer ? ' '+offer.condition : 'New' );
			}
			,(offer, isOverlap)=>
			{
				if( !isOverlap )
				{
					newProduct.offers.push( offer );
				}
			}
		);
	}
}
