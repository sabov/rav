var Rav = function(component) {
  if (typeof React !== 'undefined') {
    return transformToReact(component);
  } else if (typeof ng !== 'undefined') {
    return transformToAngular(component);
  } else if (typeof Vue !== 'undefined') {
    return transformToVue(component);
  }
}

Rav.prototype {
  events: [
    'onClick', 'onContextMenu', 'onDoubleClick', 'onDrag', 'onDragEnd',
    'onDragEnter', 'onDragExit', 'onDragLeave', 'onDragOver',
    'onDragStart', 'onDrop', 'onMouseDown', 'onMouseEnter', 'onMouseLeave',
    'onMouseMove', 'onMouseOut', 'onMouseOver', 'onMouseUp'
  ];

  setReactProps: function(tpl, ctx) {
    if (!_.isArray(tpl)) {
      var path = tpl
        .replace('inputs', 'props')
        .replace('children', 'props.children');
      return _.get(ctx, path);
    }
    var reactTpl = [
      tpl[0],
      _.transform(tpl[1], function(result, value, key) {
        if(_.includes(events, key)) {
          result[key] = ctx[value];
        } else if (key === 'className') {
          var className = value[0];
          if (value[1]) {
            _.forIn(value[1], function(v, k) {
              if (_.get(ctx, v)) {
                className += ` ${k}`;
              }
            })
          }
          result[key] = className;
        }
      })
    ].concat(tpl.slice(2).map(function(child) {
      return this.setReactProps(child, ctx);
    }.bind(this)));
    return React.createElement.apply(React, reactTpl);
  }

  transformToReact: function(component) {
    var reactClass = {
      getInitialState: component.state,
      render: function() {
        return this.setReactProps(component.template(), this);
      }
    }
    reactClass = Object.assign(reactClass, component.methods);
    return React.createClass(reactClass);
  }

  buildAngularTpl: function(tpl) {
    if (!_.isArray(tpl)) {
      return tpl
        .replace(/inputs\.(.*)/, '{{$1}}')
        .replace('children', '<ng-content></ng-content>');
    }
    var el = tpl[0];
    return `
      <${el}
        ${_.values(_.transform(tpl[1], function(result, value, key) {
          if(_.includes(events, key)) {
            result[key] = `(${key.toLowerCase().replace('on', '')})="${value}()"`;
          } else if (key === 'className') {
            result[key] = `class="${value[0]}"`
            if (value[1]) {
              var ngClass = JSON.stringify(value[1]).replace(/"/g, '');
              result[key] += ` [ngClass]="${ngClass}"`;
            }
          }
        })).join(' ')}
      >
        ${tpl.slice(2).map(function(child) {
          return this.buildAngularTpl(child);
        }.bind(this)).join('')}
      </${el}>
    `;
  }

  transformToAngular: function(component) {
    return ng.core.Component({
      selector: component.alias,
      template: this.buildAngularTpl(component.template()),
      inputs: component.inputs,
    }).Class(Object.assign({
      constructor: function() {
        this.state = component.state();
      },
      setState: function(state) {
        _.forIn(state, function(v, k) {
          this.state[k] = v;
        }.bind(this))
      }
    }, component.methods));
  }

  buildVueTpl: function(tpl) {
    if (!_.isArray(tpl)) {
      var a = tpl
        .replace(/inputs\.(.*)/, '{{$1}}')
        .replace('children', '<slot></slot>');
      return a;
    }
    var el = tpl[0];
    return `
      <${el}
        ${_.values(_.transform(tpl[1], function(result, value, key) {
          if(_.includes(events, key)) {
            result[key] = `v-on:${key.toLowerCase().replace('on', '')}="${value}"`;
          } else if (key === 'className') {
            result[key] = `class="${value[0]}"`
            if (value[1]) {
              var vueClass = JSON.stringify(value[1]).replace(/"/g, '');
              result[key] += ` v-bind:class="${vueClass}"`;
            }
          }
        })).join(' ')}
      >
        ${tpl.slice(2).map(function(child) {
          return this.buildVueTpl(child);
        }.bind(this)).join('')}
      </${el}>
    `;
  },
  transformToVue: function(component) {
    Vue.component(component.alias, {
      template: this.buildVueTpl(component.template()),
      props: component.inputs,
      methods: Object.assign({
        setState: function(state) {
          _.forIn(state, function(v, k) {
            this.state[k] = v;
          }.bind(this))
        }
      }, component.methods),
      data: function() {
        return { state: component.state() };
      }
    });
  }
}
