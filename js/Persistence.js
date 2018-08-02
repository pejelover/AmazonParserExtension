
class Persistence
{
	constructor()
	{
		this.database= new DatabaseStore
		({
			name		: 'products'
			,version	: 6
			,stores		:{
				products:
				{
					keyPath	: 'asin'
					,autoincrement: false
					,indexes	:
					[
						{ indexName : 'producer'	,keyPath:'producer' ,objectParameters: { uniq: false, multiEntry: false} }
						,{ indexName: 'sellers'	,keyPath:'sellers'	,objectParameters: { uniq: false ,multiEntry: true} }
						,{ indexName: 'search'	,keyPath:'search'	,objectParameters: { uniq: false ,multiEntry: true} }
						,{ indexName: 'parsedDates'	,keyPath:'parsedDates', objectParameters: { uniq: false ,multiEntry: true} }
					]
				}
				,urls:
				{
					keyPath: 'url'
					,autoincrement: false
					,indexes	:
					[
						{indexName: 'type', keyPath: 'type', objectParameters:{ uniq: false, multiEntry: true } }
					]
				}
			}
		});

		this.database.init();
	}

	updateUrl( url )
	{
		return this.database.put( 'urls', url );
	}

	updateProduct( product )
	{
		return this.database.get('products',product.asin ).then(( oldProduct )=>
		{
			if( oldProduct )
				this.mergeProducts(oldProduct, product );

			if( 'qids' in product )
			{
				delete product.qids;
			}

			if( !( 'offers' in product) )
				product.offers  = [];

			if( 'time' in product )
			{
				if( 'parsed' in product )
				{
					product.parsed = product.time;
					delete product.time;
				}
			}

			if( 'dateParsed' in product )
			{
				if( !( 'parsed' in product ) )
				{
					let x = new Date( product.dateParsed );
					product.parsed = x.toISOString();
				}

				delete product.dateParsed;
			}

			if( product.offers.length === 0 )
			{
				if( product.price )
				{
					let date = new Date( product.parsed );

					let offer = {
						price	: product.price
						,time	: date.toISOString()
					};

					product.offers.push( offer );
				}
			}

			if( 'versions' in product )
				delete product.versions;

			return this.database.put('products', product );
		})
		.catch((e)=>
			{
			//This implentation sucks, can occour a data loss
			//XXX do some refactoring here and there ^|
			//console.error("product not found", e );
				return Promise.resolve( product );
			//return this.put('products', product );
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
			,'sellers'		:true
			,'parsedDates'	:true
			,'merchants_ids':true
		};

		if( 'offers' in oldProduct )
		{
			if( !('sellers' in oldProduct ) )
			{
				oldProduct.sellers = [];
			}
			oldProduct.offers.forEach((offer )=>
			{
				if( 'seller' in offer )
				{
					oldProduct.sellers.push( offer.seller.toLowerCase() );
				}
			});
		}

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

		this.overlapingInfo( oldProduct.stock, newProduct.stock, 'date', (element,isOverlap)=>
		{
			if( !isOverlap )
				newProduct.stock.push( element );
		});

		if( !newProduct.offers )
			newProduct.offers = [];

		this.overlapingInfo(
			oldProduct.offers
			,newProduct.offers
			,(offer)=>
			{
				return offer.price+' '+offer.time+' '+offer.sellerName+' '+( offer.is_prime ? 'prime' :'' )+( 'condition' in offer ? ' '+offer.condition : 'New' );
			}
			,(offer, isOverlap)=>
			{
				if( 'qid' in offer )
				{
					delete  offer.qid;
				}

				if( !isOverlap )
				{
					newProduct.offers.push( offer );
				}
			}
		);
	}

	getProductList( options )
	{
		return this.database.getAll('products',{});
	}

	getProductListBySearch( search )
	{
		return this.database.getAll('products', {index:'search', '=': search });
	}

	getProductListByParsedDate( search,options)
	{
		let opt	= {
			index	: 'parsed'
		};

		if( options.start )
		{
			opt['>='] = options.start;
		}

		if( options.end )
		{
			opt['<'] = options.end;
		}

		return this.database.getAll('products', options );
	}


	generateHistoricPrices()
	{

	}


	generateRawReport( productsArray )
	{
		let keys 		= Object.keys( this.getValidRawReportKeys() );

		let s = keys.join('\t')+'\n';

		productsArray.forEach(( product )=>
		{
			let row = [];
			keys.forEach((key)=>
			{
				if( key in product )
				{
					let value =  typeof product[key] === 'string'
						? product[key].trim().replace(/"/g, '""' ).replace(/\t/,' ')
						: product[ key ];

					row.push( '"'+value+'"' );
				}
				else
				{
					row.push( '""' );
				}
			});

			s+= row.join('\t')+'\n';
		});

		return s;
	}

	generateHistoricStockReport( productsArray )
	{
		let keys 		= Object.keys( this.getValidHistoricStockKeys() );

		let s = keys.join('\t')+'\n';
		let days	= {};

		productsArray.forEach(( product )=>
		{
			if( !('stock' in product ) )
			{
				return;
			}

			product.stock.forEach((stock)=>
			{
				let row = [];

				keys.forEach((key)=>
				{
					if( key == "asin" )
					{
						row.push( product.asin );
						return;
					}

					if( key in stock )
					{
						let value =  typeof stock[key] === 'string'
							? stock[key].trim().replace(/"/g, '""' ).replace(/\t/,' ')
							: stock[ key ];

						row.push( '"'+value+'"' );
					}
					else
					{
						row.push( '""' );
					}
				});

				s+= row.join('\t')+'\n';
			});
		});

		return s;
	}

	getValidHistoricStockKeys()
	{
		// this is a dictionary, why?
		// Maybe a map for diferent values
		return {
			"asin"	: true
			,"seller": true
			,"time"	: true
			,"qty": true
			,"seller_id": true
			,"seller_url": true
			,"smid"	: true
		};
	}

	getValidRawReportKeys()
	{
		// this is a dictionary, why?
		return {
			asin: true
			,url:true
			,producer: true
			,title	: true
			,stock	: true
			,no_offers	: true
			,no_offers_text: true
			,rating	: true
			,number_of_ratings: true
		};
		/*
		return {
			'asin':1
			,'url_keyword':1
			,'producer':1
			//,'producer_url':1
			,'sale':1
			,'shipping':1
			,'price':1
			,'url':1
			,'title':1
			,'rating':1
			,'left qty':1
			,'left':1
			,'choice':1
			,'number_of_ratings':1
			,'fullfilled_by':1
			,'no_offers_text':1
			,'no_offers':1
			,'no_offers_url':1
			,'Rank':1
			,'Rank Department':1
			,'vendors':1
			,'description':1
			,'Sold by':1
			,'fetures_1':1
			,'fetures_2':1
			,'fetures_3':1
			,'fetures_4':1
			,'fetures_5':1
			,'image_0':1
			,'image_1':1
			,'image_2':1
			,'image_3':1
			,'image_4':1
			,'image_5':1
			,'image_6':1
			,'versions':1
			,'Part Number':1
			,'Number of Items':1
			,'Brand Name':1
			,'EAN':1
			,'Material':1
			,'Model Number':1
			,'Style':1
			,'UNSPSC Code':1
			,'UPC':1
			,'Shipping Weight:':1
			,'ASIN:':1
			,'Item model number':1
			,'Average Customer Review':1
			,'Best Sellers Rank':1
			,'Measurement System':1
			,'Item Weight':1
			//,'Thread Type':1
			,'Product Dimensions':1
			,'Color':1
			,'Size':1
			,'Domestic Shipping':1
			,'International Shipping':1
			,'Shipping Information':1
			,'Item Weight':1
			,'Height':1
			//,'Item Shape':1
			//,'Maximum Temperature':1
			,'Width':1
			//,'Shipping Advisory':1
			//,'Specification Met':1
			,'Length':1
			//,'Lower Temperature Range':1
			//,'Upper Temperature Rating':1
			//,'Included Components':1
			//,'Lower Temperature Rating':1
			,'Parsed Date';:1
			*/
	}

	getDateString( date )
	{
		let fl = (i)=> i<10 ? '0'+i : i;
		let dateStr = date.getFullYear()+'-'+fl( date.getMonth()+1 )+'-'+fl( date.getDate() );

		return dateStr;
	}
}
