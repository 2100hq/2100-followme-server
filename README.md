# 2100-followme-server
Backend for experimental chat app using the 2100 api. This attempts to make a permissions
based communication app that only shows messages to people who own your 2100 tokens. 

## ENV

```
service=followme
express.port=5498
rethink.db=followme
2100.host=ws://socket.staging.2100.co
defaultThreshold=.01
```

## API
### Authentication
This uses `Bearer ${token}` authentication. Provide this in your header with each
request. In the demo version just provide your public address.

```
  options.headers['Authorization'] = 'Bearer ' + publicAddress
```
### API Paths: Public, Private
Api is split into various api routes, currently just `public` and `private`. These are accessed
with GET or POST routes.
```
  //showing axios options for calling 
  options.method = 'POST'
  options.data = [param1,param2]
  //calling the private route
  options.url = `${followmeurl}/private/${method}`
  options.json = true

```

### Passing Parameters
Parameters are sent attached to the data attribute for POST. 

```
  options.data = [param1,param2]

  //example for /private/sendMessage(tokenid:string,message:string,threshold:number) => message

  options.data = [
    tokenid,
    message,
    threshold
  ]
```

### Public API
Unauthenticated routes.

#### POST public/echo(x:any) => x
This will just echo back what you pass in

#### POST public/feed(start:int,end:int) => messages[]
Returns blank messages representing messaging activity. 

### Private API
This is the bulk of the api, all private calls require a authentication token.

#### POST private/me => user
Returns your currently authenticated user. You can use this to test if auth worked.

#### POST private/myToken => token[]
Check what 2100 tokens you own. This is the equivalent of your owned twitter addresses on 
the 2100 app. 

#### POST private/sendMessage(tokenid:string,message:string,threshold:number) => message
Post a message to your 2100 token channel. This message will also be sent to any users who
hold any of your tokens over threshold. There is a default threshold set to 1 cent if you 
do not provide a threshold.

#### POST private/getMyInbox(start:Date,end:Date) => message[]
Retrieve all messages either you sent, or you have subscribed to between dates. The start date
must be less than the end date. If not supplied start=0 and end=Date.now()

#### POST private/getTokenFeed(tokenid:string,start:Date,end:Date) => message[]
Get all messages posted by a 2100 owner on their token. This will only return 
messages you are authorized to view.

#### POST private/followers(tokenid:string,threshold:number) => userids[]
See a list of users who own more than threshold of your token. You must own the token.

#### POST private/setDefaultThreshold(threshold:number) => user
Set your default message threshold visibility when sending a message to your followers.
This can also be overridden by explicitly setting it when calling `private/sendMessage`.












