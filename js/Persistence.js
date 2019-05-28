
import AmazonParser from './AmazonParser/AmazonParser.js';
import PromiseUtils from './Promise-Utils/PromiseUtils.js';
import DatabaseStore from './db-finger/DatabaseStore.js';
import default_settings from './default_settings.js';
import ArraySorter from './dealer-sorter/ArraySorter.js';
import ProductUtils from './AmazonParser/ProductUtils.js';

export default class Persistence
{
	constructor()
	{
		this.productUtils	= new ProductUtils({});
		this.database	= new DatabaseStore
		({
			name		: 'products'
			,version	: 22
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
						,{ indexName: 'parsed'	,keyPath:'parsed', objectParameters: { uniq: false ,multiEntry: false} }
					]
				}
				,notFound:
				{
					keyPath: 'id'
					,autoincrement: true
					,indexes	:
					[
						{ indexName: 'asin', keyPath:'asin', objectParameters:{ uniq: false, multiEntry: false}  }
					]
				}
				,stock:
				{
					keyPath	: 'id'
					,autoincrement: true
					,indexes	:
					[
						{ indexName : 'asin'	,keyPath:'asin' ,objectParameters: { uniq: false, multiEntry: false} }
						,{ indexName: 'time'	,keyPath:'time'	,objectParameters: { uniq: false ,multiEntry: false} }
						,{ indexName: 'seller_id'	,keyPath:'seller_id'	,objectParameters: { uniq: false ,multiEntry: false} }
					]
				}
				,offers:
				{
					keyPath	: 'id'
					,autoincrement: true
					,indexes	:
					[
						{ indexName : 'asin'	,keyPath:'asin' ,objectParameters: { uniq: false, multiEntry: false} }
						,{ indexName: 'time'	,keyPath:'time'	,objectParameters: { uniq: false ,multiEntry: false} }
						,{ indexName: 'seller_id'	,keyPath:'seller_id'	,objectParameters: { uniq: false ,multiEntry: false} }
					]
				}
				,links:
				{
					keyPath: 'id'
					,autoincrement: true
					,indexes	:
					[
						{indexName: 'url', keyPath: 'url', objectParameters:{ uniq: false, multiEntry: true } }
						,{indexName: 'type', keyPath: 'type', objectParameters:{ uniq: false, multiEntry: true } }
					]
				}
				,urls:
				{
					keyPath: 'asin'
					,autoincrement: false
					,indexes	:
					[
						{indexName: 'friendly_ceo', keyPath: 'friendly_ceo', objectParameters:{ uniq: false, multiEntry: false } }
						,{ indexName: 'time', keyPath: 'time', objectParameters:{ uniq: false, multiEntry: false} }
					]
				}
				,settings:
				{
					keyPath: 'id'
					,autoincrement: false
					,indexes	:  []
				}
				,sellers:
				{
					keyPath	: 'id'
					,autoincrement: false
					,indexes	:
					[
						//i dont know if name is uniq
						{indexName: 'name', keyPath: 'name' ,objectParameters: { uniq: false, multiEntry: false } }
					]
				}
			}
		});

		//this.database.init();
	}

	addUrlsObjs( toAdd )
	{
		return this.database.addAll('urls', toAdd, true );
	}

	addUrls( urls )
	{

		let parser = new AmazonParser({});
		let toAddKeys = [];

		urls.forEach((url)=>
		{
			let asin = parser.getAsinFromUrl( url.url );
			if( asin in toAddKeys )
				return;

			let friendlyCeo = parser.getCeoFriendlyLink( url.url );

			if( !( asin && friendlyCeo ) )
			{
				return;
			}

			toAddKeys[ asin ] = { asin: asin, friendly_ceo: friendlyCeo.substring(1), time: parser.productUtils.getTime() };
		});

		let toAdd = Object.values( toAddKeys );

		return this.database.addAll('urls', toAdd, true ).then(()=>
		{
			return this.database.putItems('links',urls );
		});
	}

	init()
	{
		return this.database.init();
		//.then(()=>
		//{
		//	return this.deleteBadValues();
		//});
	}

	getUrlsByAsinReport( asinDictionary )
	{
		console.log('AsinDictionary',asinDictionary );
		let asins = Object.keys( asinDictionary ).sort();

		return this.database.getByKey('urls',asins ).then((urlFounds)=>
		{
			let dbDictionary = {};

			urlFounds.forEach((i)=>
			{
				if( !(i.asin in dbDictionary) )
				{
					dbDictionary[ i.asin ] = i;
				}
			});

			let result = [];
			let prefix  = 'https://www.amazon.com';


			asins.forEach((asin)=>
			{
				if( asin in dbDictionary )
				{
					asinDictionary[ asin ].forEach((i)=>
					{
						let m = i === 'ATVPDKIKX0DER' ? '' : '/?m='+i;

						result.push([
							asin
							,i
							,prefix+'/'+dbDictionary[ asin ].friendly_ceo+'/dp/'+asin+m
							,dbDictionary[ asin ].time
						]);
					});
				}
				else
				{
					asinDictionary[asin].forEach((i)=>
					{
						let m = i === 'ATVPDKIKX0DER' ? '':'/?m='+i;

						result.push([
							asin
							,i
							,prefix+'/dp/'+asin+m
							,''
						]);
					});
				}
			});


			console.log( result );

			let asorter = new ArraySorter();
			let a = asorter.sort( result , 0 );

			a.splice( 0, 0,['asin','seller id','url','time']);

			return Promise.resolve( a );
		});
	}

	deleteBadValues()
	{
		//2018-09-27T21:44:00.000Z
		//2018-09-27T21:41:00.000Z
		//this.database.getAll('stock',{ index:'time','>=':"2018-09-27T21:40:00.000Z", '<=':'2018-09-28T22:45:00.000Z'}).then((all)=>
		//{
		//	let toRemove = [];
		//	all.forEach((z)=>
		//	{
		//		let qty = this.productUtils.getQty( z.qty );

		//		if( qty === '999' ||  qty === 999 )
		//		{
		//			toRemove.push( z.id );
		//		}
		//	});

		//	return this.database.deleteByKeyIds('stock',toRemove );
		//})


		this.database.getAll('products',{})
		.then(( products )=>
		{
			let parser = new AmazonParser();

			let newUrls = products.reduce((p,c)=>
			{
				let asin = parser.getAsinFromUrl( c.url );

				let friendlyCeo = parser.getCeoFriendlyLink( c.url );

				if( !( asin && friendlyCeo ) )
				{
					return p;
				}

				p.push({ asin: asin, friendly_ceo: friendlyCeo.substring(1), time: parser.productUtils.getTime() });
				return p;
			},[]);

			this.database.addAll('urls', newUrls, true );
		});

		//this.database.removeAll('offers',{ '<=':696057 } )
		//.then((deleted)=>
		//{
		//	console.log('Deleted', deleted );
		//})
		//.catch((error)=>
		//{
		//	console.log('An error occours', error );
		//});
	}

	updateUrl( url )
	{
		return this.database.addAll( 'links', [url], true );
	}

	addNotFound( notFoundObj )
	{
		return this.database.put('notFound', notFoundObj );
	}

	addStock( stockArray )
	{
		let filtered = stockArray.reduce( (prev,stock) =>
		{

			if( 'qty' in stock && 'time' in stock && 'seller_id' in stock )
			{
				if( stock.seller_id === 'amazon.com' )
				{
					stock.seller_id = 'ATVPDKIKX0DER';
					stock.is_prime = true;
				}

				if( /Currently unavailable/.test( stock.qty ) )
				{
					stock.is_prime = true;
					let nS = {};

					for(let i in stock )
					{
						nS[i] = stock[i];
					}

					stock.is_prime = false;
					prev.push( nS );
				}

				if( 'is_prime' in stock  )
				{
					prev.push( stock );
				}
				else
				{
					console.log( 'Stock '+stock.asin+'_'+stock.seller_id+' doestn have is_prime'+JSON.stringify( stock ) );
				}
			}
			return prev;
		},[]);

		return this.database.addIAll( 'stock', filtered, true );
	}

	addOffers( offersArray )
	{
		let filtered = offersArray.filter( offer => 'price' in offer && 'time' in offer );
		return this.database.addAll( 'offers', filtered , true );
	}

	getOffers(date1,data2Keys)
	{
		return this.database.getAll('offers',{});
	}

	getOffersByOptions( options )
	{
		return this.database.getAll('offers',options );
	}

	getOffersKeys(date1,data2Keys)
	{
		return this.database.getAllKeys('offers',{});
	}

	getAllAsinForSeller( seller_id )
	{
		let asins = {};
		let indexObject = { index:'seller_id' ,'=':seller_id };

		return this.database.getAll('stock', indexObject ).then((stocks)=>
		{
			stocks.forEach((i)=>
			{
				asins[ i.asin ] = true;
			});
			return this.database.getAll('offers', indexObject );
		})
		.then((offers)=>
		{
			offers.forEach((i)=>
			{
				if( 'asin' in i )
					asins[ i.asin ] = true;
			});

			let values = Object.keys( asins ).sort();

			return this.database.getByKey('urls',values );
		})
		.then((urls)=>
		{
			let urlDicts = {};

			urls.forEach((i)=>
			{
				urlDicts[ i.friendly_ceo  ] = true;
				asins[ i.asin ] = true;
			});

			let urlValues = Object.keys( urlDicts ).sort();

			return this.database.getByKey( 'urls', urlValues, { index: 'friendly_ceo' });
		})
		.then((urls)=>
		{
			let urlDicts = {};

			urls.forEach((i)=>
			{
				asins[ i.asin ] = true;
			});

			return Promise.resolve( Object.keys( asins ) );
		});
	}

	getOffersCount(date1,data2Keys)
	{
		return this.database.count('offers',{});
	}

	updateProduct( product )
	{
		return this.database.get('products' ,product.asin )
		.catch((error)=>
		{
			return product;
		})
		.then(( oldProduct )=>
		{
			if( oldProduct )
				this.productUtils.mergeProducts( oldProduct, product, true );

			try
			{
				this.productUtils.cleanProductNormalize( product );
			}
			catch(e)
			{
				console.error( e );
			}

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
		console.log("Update ProductList");
		return PromiseUtils.runSequential( list, (newProduct,index)=>
		{
			return this.updateProduct( newProduct );
		});
	}

	saveProductLists( list )
	{
		return this.database.updateItems('products', list );
	}

	/*
	optimizeStock()
	{
		return this.database.count( storeName, {}).then((offersCount)=>
		{
			let all = [];
			let newOptions = { '>=': 0, count: 50000 };

			let start 	= 1;
			let count	= offersCount/newOptions.count;

			if( count !== Math.floor( count ) )
				count = Math.floor( count )+1;

			let times =new Array( count );
			times.fill(0);
			let allRecords = [];

			let last_id = null;
			let generator = ()=>
			{
				return this.database.getAll('stock', newOptions ).then(( stockList )=>
				{
					let allKeys = {};
					let toDelete = [];

					stockList.forEach(( stock )=>
					{
						//2018-08-30T16:11:00.000Z
						let key = stock.time.substring(0,15)+stock.asin+stock.seller_id+( stock.is_prime? 1 : 0 );

						if( key in allKeys )
						{
							let oldValue = this.productUtils.getQty( allKeys[ key ].qty );
							let newValue = this.productUtils.getQty( stock.qty );
							let bestValue = this.getQtyABestValue( oldValue, newValue );

							if(  bestValue === newValue )
							{
								toDelete.push( allKeys[ key ].id );
								allKeys[ key ] = stock;
								last_id = stock.id;
							}
							else
							{
								toDelete.push( stock.id );
							}
						}
						else
						{
							allKeys[ key ] = stock;
							last_id = stock.id;
						}
					});

					newOptions[ '>=' ] = last_id;
					return this.database.deleteByKeyIds('stock',toDelete );
				});
			};

			return PromiseUtils.runSequential( times, generator )
			.then(()=>
			{
				return Promise.resolve( allRecords );
			});
		});
	}
	*/

	getAllIncremental( storeName, options , indexName )
	{
		console.log( options );

		return this.database.count(storeName, {}).then((offersCount)=>
		{
			let all = [];
			let newOptions = {};

			for(let i in options )
			{
				newOptions[ i ] = options[ i ];
			}

			if( !('count' in newOptions ) )
			{
				newOptions.count = 100000;
			}

			if( offersCount === 0 )
			{
				return Promise.resolve( [] );
			}

			let start 	= 1;
			let count	= offersCount/newOptions.count;

			if( count !== Math.floor( count ) )
				count = Math.floor( count )+1;

			let times =new Array( count );
			times.fill(0);
			let allRecords = [];

			let generator = ()=>
			{
				return this.database.getAll(storeName, newOptions ).then((all)=>
				{
					if( all.length === 0 )
						return Promise.resolve( 1 );

					newOptions[ '>=' ] = all[ all.length-1 ][ indexName ];
					console.log('Start', newOptions[ '>='] );
					allRecords.push( ...all );
					return Promise.resolve( 1 );
				});
			};

			return PromiseUtils.runSequential( times, generator )
			.then(()=>
			{
				return Promise.resolve( allRecords );
			});
		});
	}

	getStockList( date1, date2 )
	{
		let start = '2018-07-20T05:26:00.000Z';

		let options = { 'index' : 'time', '>=' : start };

		if( date1 )
		{
			options['>='] = date1.toISOString();
		}

		if( date2 )
		{
			options['<='] = date2.toISOString();
		}

		return this.getAllIncremental('stock',options,'time');
		//return this.database.getAll('stock', options );
	}

	getProductListByAsins( asin_list )
	{
		if( asin_list.length === 0 )
			return Promise.resolve([]);

		let x  = {};

		asin_list.forEach(i => x[i]=1 );

		let asins = Object.keys( x ).sort((a,b)=>
		{
			if( a == b )
				return 0;
			return a < b ? -1 : 1;
		});

		let options ={'>=':asins[0], '<=':asins[asins.length-1] };

		return this.database.getByKey('products',asins, options );

	}

	getProductList( date1, date2 )
	{
		console.log( date1, date2 );

		let options = {};

		if( date1 )
		{
			options.index = 'parsedDates';
			options['>='] = date1;
		}

		if( date2 )
		{
			options.index = 'parsedDates';
			options['<='] = date2;
		}

		return this.database.getAll('products', options );
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
						? product[key].replace(/\s+/g,' ').trim()
						: product[ key ];

					if( value && value.length > 3200 )
						value = value.substring(0,3200 );

					row.push( value );
				}
				else
				{
					row.push( '' );
				}
			});

			s+= row.join('\t')+'\n';
		});

		return s;
	}

	getUrlList( date1, date2 )
	{
		let option = {
			'>=':0
		}

		return this.getAllIncremental( 'links',{ '>=': 0 },'id');
	}

	generateHistoricReportByDays( productsArray, date1, date2 )
	{
		let keys 		= Object.keys( this.getValidHistoricStockKeys() );

		let s = keys.join('\t')+'\n';
		let days	= {};

		productsArray.forEach(( product )=>
		{
			if(!( 'title' in product ) )
				product.title = '';

			if(!( 'producer' in product ) )
				product.producer = '';

			let row = [];

			try{
			if( !( 'stock' in product) || product.stock.length === 0 )
			{

				keys.forEach((key)=>
				{
					if( key === "producer " || key == "asin" || key === "title" )
					{
						row.push( this.getValueFromRow( key, product ) );
					}
					else
					{
						row.push( '""' );
					}
				});

				console.log(",");
				s+= row.join('\t')+'\n';
			}
			else
			{
				product.stock.forEach((stock)=>
				{
					row = [];

					keys.forEach((key)=>
					{
						if( key == "asin" || key == "producer" || key == "title" || key == "url" )
						{
							row.push( this.getValueFromRow( key, product ) );
							return;
						}

						if( key === "qty" )
						{
							row.push( this.productUtils.getQty( stock.qty ) );
							return;
						}


						row.push( this.getValueFromRow( key, stock ) );
					});

					s+= row.join('\t')+'\n';
				});

			}
			}catch(e)
			{
				console.error('ON catch for stock', e );
				s+='\n';
			}
		});

		return s;
	}

	generatePreferencesSellersHistoricStockReport( productsArray, date1String, date2String )
	{
			return this.getSettings()
			.then((settings)=>
			{
				return this.generateHistoricStockReport( productsArray, date1String, date2String, settings.product_sellers_preferences );
				//settings.product_sellers_preferences; //{ asin: [ sellers ids], .... }
			});
	}

	generateHistoricStockReport( productsArray, date1String, date2String, product_sellers_preferences )
	{
		let keys 		= Object.keys( this.getValidHistoricStockKeys() );

		let s = keys.join('\t')+'\n';
		let days	= {};

		productsArray.forEach(( product )=>
		{
			if(!( 'title' in product ) )
				product.title = '';

			if(!( 'producer' in product ) )
				product.producer = '';


			let row = [];

			try
			{
				if( !( 'stock' in product) || product.stock.length === 0 )
				{

					keys.forEach((key)=>
					{
						if( key === "producer " || key == "asin" || key === "title" )
						{
							row.push( this.getValueFromRow( key, product ) );
						}
						else
						{
							row.push( '""' );
						}
					});

					s+= row.join('\t')+'\n';
				}
				else
				{
					product.stock.forEach((stock)=>
					{
						row = [];
						keys.forEach((key)=>
						{
							if( key == "asin" || key == "producer" || key == "title" || key == "url" )
							{
								row.push( this.getValueFromRow( key, product ) );
								return;
							}

							if( key === "qty" )
							{
								row.push( this.productUtils.getQty( stock.qty  ));
								return;
							}

							row.push( this.getValueFromRow( key, stock ) );
						});

						s+= row.join('\t')+'\n';
					});
				}
			}
			catch(e)
			{
				console.error('ON catch for stock', e );
				s+='\n';
			}
		});

		return s;
	}

	generateHistoricPriceReport( productsArray )
	{
		let keys 		= Object.keys( this.getValidHistoricPriceKeys() );

		let s = keys.join('\t')+'\n';
		let days	= {};

		productsArray.forEach(( product )=>
		{
			if( !('offers' in product ) )
			{
				return;
			}
			console.log(".");

			product.offers.forEach((offer)=>
			{
				let row = [];

				keys.forEach((key)=>
				{
					if( key == "asin" || key == "title" )
					{
						row.push( this.getValueFromRow( key, product ) );
					}
					else
					{
						row.push( this.getValueFromRow( key, offer ) );
					}
				});

				s+= row.join('\t')+'\n';
			});
		});

		return s;
	}

	getValueFromRow( key, obj )
	{
		if( key in obj )
		{
			if( typeof obj[ key ] === 'boolean' )
				return obj[ key ] ? 1 : 0;

			if( obj[ key ] === 'NOT FOUND' )
				return 'N/A';


			if( typeof obj[ key ] === 'string' )
			{
				let value = obj[ key ].trim().replace(/\s+/g,' ');

				if( /^".*"$/.test( value ) )
				{
					return value.replace(/^"(.*)"$/,'$1');
				}
				return value;
			}

			return obj[ key ];
		}

		return '';
	}

	getValidHistoricStockKeys()
	{
		// this is a dictionary, why?
		// Maybe a map for diferent values
		return {
			"asin"	: true
			,"url"	: true
			,"key"	: true
			,"id"	: true
			,"producer" : true
			,"qty": true
			,"title"	: true
			,"seller": true
			,"time"	: true
			,"seller_id": true
			,"seller_url": true
			,"smid"	: true
		};
	}

	getValidHistoricPriceKeys()
	{
		return	{
			"asin" : true
			,"price"	: true
			,"time"	: true
			,"seller" : true
			,"seller_id": true
			,"shipping"	: true
			,"condition"	: true
			,"fullfilled_by"	: true
			,"title"		: true
		};
	}

	getDownloadHref( object, contentType )
	{
		let ctype = contentType ? contentType : 'application/json';

		var blob = new Blob([typeof object === 'string' ? object : JSON.stringify( object , null, 2)], {type :  ctype });
		let objectURL = URL.createObjectURL( blob );
		return objectURL;
	}

	getValidRawReportKeys()
	{
		// this is a dictionary, why?
		return {
			asin: true
			,url:true
			,producer: true
			,title	: true
			,price : true
			//,stock	: true
			,no_offers	: true
			,no_offers_text: true
			,rating	: true
			,number_of_ratings: true
			,shipping: true
			,parsed: true

			,'Rank':1
			,'Rank Department':1
			,'description':1
			//,'Sold by':1
			//,'fetures_1':1
			//,'fetures_2':1
			//,'fetures_3':1
			//,'fetures_4':1
			//,'fetures_5':1
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
			,'Product Dimensions':1
			,'Color':1
			,'Size':1
			,'Domestic Shipping':1
			,'International Shipping':1
			,'Shipping Information':1
			//,'Item Weight':1
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
			//,'Parsed Date';:1
			//,left: true
			//,fullfilled_by: true
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

	saveSettings(settings)
	{
		return this.database.put('settings', settings ).catch((e)=>
		{
			console.error( e );
		});
	}

	getSettings()
	{
		return this.database.get('settings', 1 ).then((result)=>
		{
			for(let  i in default_settings )
			{
				if( !( i in result ) )
					result[ i ] = default_settings[ i ];
			}

			for( let i in default_settings.page_sellers )
			{
				if( !( i in result.page_sellers ) )
				{
					result.page_sellers[ i ] = default_settings.page_sellers[ i ];
				}
			}

			return result;
		})
		.catch((e)=>
		{
			console.log("Error getting settings"+e.msg );
			return default_settings;
		});
	}


	getAllPrices()
	{
		return this.database.getAll('offers',{});
	}

	getPriceReport( offers )
	{
		let allColumns			= {
			'asin'	: 0
			,'seller_id' : 1
			,'key': 2
		};

		let transformedObjects	= [];

		offers.forEach((offer)=>
		{
			if( !('asin' in offer && 'price' in offer && 'time' in offer ) )
				return;

			let date = new Date( offer.time );
			let date2 = new Date();

			let f = i=> i<10?'0'+i:i;

			date2.setTime( date.getTime() );
			let dateString = date2.getFullYear()+'-'+f( date2.getMonth()+1 )+'-'+f( date2.getDate() );

			let fObject = { id: offer.asin+'-'+offer.seller_id, asin: offer.asin, seller_id: offer.seller_id };

			if( offer.price == null )
				return;

			fObject[ dateString ] = offer.price.replace(/^\$/,'');
			transformedObjects.push(  fObject );
			allColumns[ dateString ] = Object.keys( allColumns ).length;
		});

		let columnSorter = (a,b)=>
		{
			if( a === b )
				return 0;

			return allColumns[ a ] < allColumns[ b ] ? -1 : 1;
		};

		let columns = Object.keys( allColumns ).sort( columnSorter );

		let itemFilter		= null;

		let itemSelector = (oldItem,newItem)=>{
			if( !newItem )
				return oldItem;

			if( !oldItem )
				return newItem;

			return newItem;
		};

		let valueMapperGetter = ( key, item )=>
		{
			return this.getValueFromRow( key, item );
		};

		//genericIndexTableGenerator( array ,index_id ,itemFilter, allKeysColumns, itemSelector, valueMapperGetter )
		let finalArray = this.genericIndexTableGenerator
		(
			transformedObjects//array
			,'id' //index_id
			,null
			,columns
			,itemSelector
			,valueMapperGetter
		);

		/*j
		let arrayReport = this.genericIndexTableGenerator
		(
			reportRows
			,'id'
			,null //itemFilter
			,columns
			,this.getQtyABestValue//ItemSelector
			,valueMapperGetter
		);
		*/









		finalArray.splice( 0, 0, columns );

		return finalArray.reduce( (prev, item ) => {  return prev + item.join("\t")+"\n"; }, '' );
	}

	optimizeLinksUrls( start,count, amazonParser )
	{
		let urlsToAdd = [];
		let allAsins = {};
		let f = 1;

		return this.database.getAllKeys('urls',{}).then((keys)=>
		{
			keys.forEach((i)=>{ allAsins[ i ] = null; });
		})
		.then(()=>
		{
			return this.database.getAll('links',{ '>': start, 'count': count }).then((links)=>
			{
				let toAddKeys 	= [];
				let toDelete	= [];

				links.forEach((link)=>
				{
					let asin = amazonParser.getAsinFromUrl( link.url );

					if( link.id >= 2837197 && link.id <= 2837288 )
					{
						console.log('FUUUUU');
					}

					if( !asin )
					{
						return;
					}

					if( asin in toAddKeys || asin in allAsins)
					{
						toDelete.push( link.id );
						return;
					}

					let friendlyCeo = amazonParser.getCeoFriendlyLink( link.url );

					if( ! friendlyCeo )
					{
						return;
					}

					toDelete.push( link.id );
					toAddKeys[ asin ] = { asin: asin, friendly_ceo: friendlyCeo.substring(1), time: link.time };
				});

				let toAdd = Object.values( toAddKeys );

				return this.database.addAll('urls', toAdd, true ).then(()=>
				{
					console.log('Removing', toDelete.length );

					if( toDelete.length )
					{
						return this.database.deleteByKeyIds('links', toDelete ).then((result)=>{
							return links.length ? Promise.resolve( links[ links.length - 1 ].id ) : Promise.resolve( 0 );
						});
					}

					return links.length ? Promise.resolve( links[ links.length - 1 ].id ) : Promise.resolve( 0 );
				});
			});
		});
	}

	optimizeAllLinksUrls()
	{
		return this.database.count( 'links', {} ).then((linksCount)=>
		{

			let amazonParser  = new AmazonParser({});

			let start 	= 1;
			let count	= linksCount/100000;

			if( count !== Math.floor( count ) )
				count = Math.floor( count )+1;

			let a = Array( count );
			a.fill( 0 );

			return PromiseUtils.runSequential(a,()=>
			{
				console.log('Optimizing start', start );

				return this.optimizeLinksUrls(start,100000, amazonParser ).then((last_id)=>
				{
					start = last_id;
					return Promise.resolve(true);
				});
			});
		});
	}

	optimizeLinks(start, count)
	{
		let allKeys = {};
		let toDelete = [];
		let last_id = null;

		let a  = new AmazonParser({});

		return this.database.getAll('links',{ '>': start, 'count': count })
		.then((linksList)=>
		{
			let links2Update = [];

			linksList.forEach(( link )=>
			{
				let toUpdate = false;

				if( !('seller_id' in link && 'asin' in link ) )
				{
					let toUpdate = true;
					let params = a.getParameters( link.url );

					if( !('seller_id' in link ) )
					{
						if( params.has('m') )
						{
							link.seller_id = params.get('m');
						}
						else if( params.has('smid') )
						{
							link.seller_id = params.get('smid');
						}
						else if( params.has('s') )
						{
							link.s  = params.get('s');
						}
						else if( params.has('merchant') )
						{
							link.merchant = params.get('merchant');
						}
						else
						{
							link.seller_id = null;
						}
					}

					if( !('asin' in link) )
					{
						link.asin = a.getAsinFromUrl( link.url );
					}
				}

				if( link.asin && link.seller_id )
				{
					let key = link.asin+link.seller_id;

					if( key in allKeys )
					{
						toDelete.push( link.id );
					}
					else
					{
						if( toUpdate )
						{
							links2Update.push( link );
						}
						allKeys[ key ] = 1;
						last_id = link.id;
					}
				}
				else
				{
					last_id = link.id;
				}
			});

			return this.database.deleteByKeyIds('links',toDelete ).then((deleted)=>
			{
				console.log('Links deleted '+deleted );
				console.log('to Update '+links2Update.length );

				this.database.putItems('links',links2Update ).then(()=>
				{
					return Promise.resolve( deleted );
				});
			});
		})
		.then(()=>
		{
			return last_id;
		});
	}

	optimizeAllUrls()
	{
		return this.database.count( 'links', {} ).then((linksCount)=>
		{
			let start 	= 1;
			let count	= linksCount/100000;

			if( count !== Math.floor( count ) )
				count = Math.floor( count )+1;

			let a = Array( count );
			a.fill( 0 );

			return PromiseUtils.runSequential(a,()=>
			{
				console.log('Optimizing start', start );

				return this.optimizeLinks(start,100000).then((last_id)=>
				{
					start = last_id;
					return Promise.resolve(true);
				});
			});
		});
	}

	optimizeAllStock()
	{
		return this.database.count( 'stock', {} ).then((stockCount)=>
		{
			let start 	= 1;

			let count	= stockCount/100000;

			if( count !== Math.floor( count ) )
				count = Math.floor( count )+1;

			let a = Array( count );
			a.fill( 0 );

			return PromiseUtils.runSequential(a,()=>
			{
				return this.optimizeStock(start,100000).then((last_id)=>
				{
					start = last_id;
					return Promise.resolve(true);
				});
			});
		});
	}

	optimizeStock(start, count)
	{
		let allKeys = {};
		let toDelete = [];
		let last_id = null;

		return this.database.getAll('stock',{ '>': start, 'count': count })
		.then((stockList)=>
		{
			stockList.forEach(( stock )=>
			{
				//2018-08-30T16:11:00.000Z
				let key = stock.time.substring(0,15)+stock.asin+stock.seller_id+( stock.is_prime? 1 : 0 );

				if( key in allKeys )
				{
					let oldValue = this.productUtils.getQty( allKeys[ key ].qty );
					let newValue = this.productUtils.getQty( stock.qty );
					let bestValue = this.getQtyABestValue( oldValue, newValue );

					if(  bestValue === newValue )
					{
						toDelete.push( allKeys[ key ].id );
						allKeys[ key ] = stock;
						last_id = stock.id;
					}
					else
					{
						toDelete.push( stock.id );
					}
				}
				else
				{
					allKeys[ key ] = stock;
					last_id = stock.id;
				}
			});

			return this.database.deleteByKeyIds('stock',toDelete );
		})
		.then(()=>
		{
			return last_id;
		});
	}

	getQtyABestValue(  oldValue ,newValue )
	{
		if( oldValue === undefined || oldValue === null )
			return newValue === undefined ? null : newValue;

		if( newValue === null
			|| newValue === undefined
			|| newValue === 'NO FOUND'
			|| newValue === 'Error > 990'
			|| newValue === 'N/A'
			|| ( (newValue === '""' || newValue === "" ) && oldValue !== null && oldValue !== undefined ) )
				return oldValue === undefined ? null : oldValue;


		let a = parseInt( oldValue,10 );
		let b = parseInt( newValue,10 );

		if( !isNaN( a ) && !isNaN( b ) )
		{
			return a < b ? a : b;
		}

		return newValue;
	}

	getStockReport2( productsArray, product_sellers_preferences )
	{
		let array = this.getStockReportArray( productsArray, product_sellers_preferences );
		let s = '';

		array.forEach(i=>
		{
			s+= i.join("\t")+"\n";
		});


		return s;
	}

	//getStockReport2( productsArray )
	//{
	//	let array = this.getStockReportArray( productsArray );

	//	let finalArray = this.genericIndexTableGenerator
	//	(
	//		array
	//		,'key'
	//		,null
	//		,null
	//		,null
	//		,(oldItem,newItem)=>newItem //ItemSelector
	//		,(key, item)=> this.getValueFromRow( key ,item )//valueMapperGetter
	//	);

	//	return finalArray.reduce( (prev, item ) => {  return prev + i.join(",")+"\n"; }, '' );
	//}

	getUrlsReport()
	{
		return this.getAllIncremental( 'links',{ '>=': 0 },'id').then((links)=>
		{
			let a = new AmazonParser({});
			let report = [['id','asin','seller_id','seller name', 'url', 'time']];

			links.forEach((link)=>
			{

				let url = link.url;
				let asin = a.getAsinFromUrl( url );

				let seller_name = '';//'seller_id' in link ? link.seller_id : '';
				let seller_id = '';

				let params = a.getParameters( url );

				if( params.has('m') )
				{
					seller_id = params.get('m');
				}

				let time =  'time' in link && link.time ? link.time : '';

				report.push([link.id, asin, seller_id, seller_name, url, time ]);
			});

			return Promise.resolve( report );
		});
	}

	getStockReportArray( stockArray, product_sellers_preferences )
	{
		let reportRows = [];
		let allColumns	= { 'asin': 1, 'seller_id':1 ,'is_prime' : 1, 'fullfilled_by':1 };

		stockArray.forEach((stock)=>
		{
			let row = {};

			if(!('asin' in stock && 'time' in stock && 'seller_id' in stock) )
				return;

			if( product_sellers_preferences && stock.asin in product_sellers_preferences && product_sellers_preferences[ stock.asin ] !== stock.seller_id )
				return;

			//if( this.productUtils.getQty( stock.qty ) == 'Error > 990' )
			//	return;

			for(let i in stock )
			{
				row[ i ] =  stock[ i ];
			}

			let date = new Date( stock.time );
			let date2 = new Date();

			let f = i=> i<10?'0'+i:i;

			date2.setTime( date.getTime() );

			let dateString = date2.getFullYear()+'-'+f( date2.getMonth()+1 )+'-'+f( date2.getDate() );
			let key = stock.asin+'_'+row.seller_id+'_'+( stock.is_prime? 1 : 0 );
			row.id = key;
			row[ dateString ] = this.productUtils.getQty( stock.qty );
			allColumns[ dateString ] = 1;
			reportRows.push( row );
		});

		let columns = Object.keys( allColumns );

		let valueMapperGetter = ( key, item )=>
		{
			return this.getValueFromRow( key, item );
		};

		let arrayReport = this.genericIndexTableGenerator
		(
			reportRows
			,'id'
			,null //itemFilter
			,columns
			,this.getQtyABestValue//ItemSelector
			,valueMapperGetter
		);

		arrayReport.splice( 0 ,0 ,columns  );
		return arrayReport;
	}

	/*
	 	genericIndexTableGenerator(
		arrayToProccess
		index_id	'Id of the colum' //Default to i
		,(old,new)=>{ return isBetter( new, old)  }//Must Replace //Null Replaces old one
		,(column)=>{ return 'mustAppearColum' == column  } //Filter
	 */

	genericIndexTableGenerator( array ,index_id ,itemFilter, allKeysColumns, itemSelector, valueMapperGetter )
	{
		let arrayResult = [];
		let allKeys		= {};
		let indexes		= {};
		let valueMapper	= typeof valueMapperGetter  === "function"
			? valueMapperGetter
			: (key, item )=> { return key in item ? item[ key ] : null; };

		console.log('allKeysColumns', allKeysColumns );

		array.forEach( (item, itemIndex )=>
		{
			if( itemFilter !== null && !itemFilter( item ) )
				return;

			let key  = index_id in item ? item[ index_id ] : valueMapperGetter( index_id, item );

			if( key === null )
				return;

			let selectedItem  = item;

			if( !( key in indexes) )
			{
				indexes[ key ] = new Array( allKeysColumns.length );
				indexes[ key ].fill( null );
			}

			let itemArray = indexes[ key ];

			allKeysColumns.forEach((column ,index)=>
			{
				let value = valueMapperGetter( column, item );

				if( itemSelector === null || indexes[ key ][ index ] === null  )
					itemArray[ index ] = value;
				else
					itemArray[ index ] = itemSelector( indexes[ key ][ index ], value );
			});
		});

		return Object.values( indexes );
	}

	deleteStock(asin,seller_id,date,qty, is_prime )
	{
		return this.database.getAll('stock',{index: 'asin', '=': asin })
		.then((stockArray)=>
		{
			let toDelete = stockArray.filter((stock)=>
			{
				if( is_prime !== null && is_prime !== stock.is_prime )
					return false;

				if( seller_id !== null )
					if( stock.seller_id !== seller_id )
						return false;

				if( qty !== null && (''+qty) !== (''+stock.qty ) )
					return false;

				if( date !== null )
				{
					let stockDate = new Date( stock.time );
					let date2 = new Date();

					date2.setTime( stockDate.getTime() );

					if( date2.toISOString().substring(0,10) !== date )
						return false;
				}

				return true;
			});

			if( toDelete.length === 0 )
				return Promise.resolve( 0 );

			let ids = toDelete.map( i=> i.id );

			return this.database.deleteByKeyIds('stock',ids );
		});
	}

	addStockItem(asin,seller_id, date, qty, is_prime )
	{
		if( !(asin && date && ( qty || qty === 0 ) && seller_id )  )
			return Promise.resolve('Fail');

		if( !(/\d{4}-\d{2}-\d{2}/.test( date )))
			return Promise.resolve('Fail');


		if( !(/^\d{4}-\d{2}-\d{2}/.test( date )))
              console.log('False');

		//2019-
        let d = new Date();
        d.setFullYear( parseInt( date.substring(0,4) ) );
        d.setMonth( parseInt( date.substring( 5,7 ) )-1 );
        d.setDate( parseInt( date.substring( 8, 10 ) ) );
        d.setHours( 10 );
        d.setMinutes( 0 );
        d.setSeconds( 0 );
	    d.setMilliseconds(0);

		return this.addStock([{asin: asin, seller_id: seller_id, time: d.toISOString(), qty: qty, is_prime: is_prime }]);
	}
}
