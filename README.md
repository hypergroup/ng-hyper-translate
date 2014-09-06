ng-hyper-translate
==================

Translation for ng-hyper

Examples
--------

### Simple String

```html
<!-- Welcome -->

<!-- In -->
<h1 data-hyper-translate="t.welcome"></h1>

<!-- Out -->
<h1>Welcome</h1>
```

### Pluralized String

```html
<!-- You have %{smart_count} notification |||| You have %{smart_count} notifications -->

<!-- In -->
<span data-hyper-translate="t.notifications <- notifications.count as smart_count"></span>

<!-- Out -->
<span>You have 3 notifications</span>
```

### Rich Content

```html
// %{user} started following %{target}

<!-- In -->
<span data-hyper-translate="t.following <- .account as user, profile as target">
  <span name="user">
    <a data-hyper-link="/users/:user" data-hyper-bind="user.name"></a>
  </span>
  <span name="target">
    <a data-hyper-link="/users/:target" data-hyper-bind="target.name"></a>
  </span>
</span>

<!-- Out -->
<span>
  <a href="/users/123">Mike</a> started following <a href="/users/456">Brannon</a>
</span>
```
